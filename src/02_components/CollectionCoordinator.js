/**
 * CollectionCoordinator - Coordinates cross-instance operations for a collection
 *
 * Encapsulates locking, conflict detection, retries, metadata updates and error handling
 * for all CRUD operations on a collection.
 *
 * @class
 */
/* exported CollectionCoordinator */
const LEASE_RENEWAL_WINDOW_MS = 250;
const LOCK_ACQUISITION_TIMEOUT_REASON = 'lock-acquisition-timeout';
const PREFLIGHT_BUDGET_EXHAUSTED_REASON = 'preflight-budget-exhausted';
const POST_OPERATION_OVERRUN_REASON = 'post-operation-overrun';
const LEASE_UNRECOVERABLE_REASON = 'lease-not-recoverable';
/**
 * Orchestrates coordinated collection operations by applying locking,
 * conflict detection, and metadata synchronisation around core CRUD actions.
 */
class CollectionCoordinator {
  /**
   * Create a new CollectionCoordinator
   * @param {Collection} collection - Collection instance to coordinate
   * @param {MasterIndex} masterIndex - MasterIndex for cross-instance coordination
   * @param {Object|DatabaseConfig} config - Coordination settings or DatabaseConfig
   * @throws {InvalidArgumentError} When dependencies or config invalid
   */
  constructor(collection, masterIndex, config = {}) {
    Validate.object(collection, 'collection');
    Validate.object(masterIndex, 'masterIndex');
    Validate.object(config, 'config');
    this._collection = collection;
    this._masterIndex = masterIndex;
    this._logger = JDbLogger.createComponentLogger('CollectionCoordinator');

    const resolvedConfig = config instanceof DatabaseConfig ? config : new DatabaseConfig(config);
    this._config = {
      lockTimeout: resolvedConfig.collectionLockLeaseMs,
      collectionLockLeaseMs: resolvedConfig.collectionLockLeaseMs,
      coordinationTimeoutMs: resolvedConfig.coordinationTimeoutMs,
      retryAttempts: resolvedConfig.retryAttempts,
      retryDelayMs: resolvedConfig.retryDelayMs,
      lockRetryBackoffBase: resolvedConfig.lockRetryBackoffBase
    };
  }

  /**
   * Coordinate a named operation with locking, conflict checks and metadata update
   * @param {string} operationName - Name of the CRUD operation
   * @param {Function} callback - Core operation callback
   * @returns {*} Result of the core operation
   * @throws {InvalidArgumentError} When arguments are invalid
   * @throws {CoordinationTimeoutError} When the collection lock cannot be acquired within the
   *   coordination window (reason: 'lock-acquisition-timeout', site 0, pre-callback).
   * @throws {CoordinationTimeoutError} When the coordination budget is exhausted before the
   *   callback runs (reason: 'preflight-budget-exhausted', site 1, pre-callback).
   * @throws {CoordinationTimeoutError} When the callback overran the coordination budget and its
   *   effects were already applied (reason: 'post-operation-overrun', site 2, post-callback).
   * @throws {CoordinationTimeoutError} When lease renewal failed and a single re-acquisition
   *   could not recover ownership (reason: 'lease-not-recoverable', site 3, post-callback).
   * @throws {LockAcquisitionFailureError} When the collection lock cannot be acquired after retries
   * @throws {ModificationConflictError} When modification tokens mismatch
   * @throws {MasterIndexError} When master index metadata finalisation fails on the within-budget path
   * @throws {*} Whatever the core operation callback throws, propagated unchanged
   * @remarks Emits a DEBUG-gated coordinator.coordinate timing event through the component
   *   logger. Timers wrap only these two methods; the raw Date.now() reads feeding timeout,
   *   lease, and retry decisions are deliberately excluded from the timing facility. On a
   *   violation path the boundary catch still emits the single operation-level failure record,
   *   but it is supplemented by point-of-occurrence records (renewal-failure, re-acquisition
   *   outcome, finalisation-failure-swallowed, finalisation-skipped, post-operation-overrun)
   *   emitted by the unified post-callback algorithm. Within-budget finalisation failures
   *   continue to propagate unchanged. The completion INFO record fires only on the success
   *   path; every violation path throws and therefore never emits it.
   */
  coordinate(operationName, callback) {
    return this._logger.timeSync('coordinator.coordinate', () => {
      Validate.nonEmptyString(operationName, 'operationName');
      Validate.type(callback, 'function', 'callback');

      const opId = IdGenerator.generateUUID();
      const name = this._collection.getName();
      let lockAcquired = false;
      let lockAcquiredAt = null;
      let succeeded = false;
      const startTime = Date.now();

      this._logger.debug(`Starting operation: ${operationName}`, { collection: name, opId });

      try {
        lockAcquiredAt = this._acquireLockWithTimeoutMapping(opId, operationName, name);
        lockAcquired = true;
        this._resolveConflictsIfPresent(name);
        this._enforcePreflightBudget(operationName, opId, name, startTime);
        const result = callback();
        const overBudget = Date.now() - startTime > this._config.coordinationTimeoutMs;
        this._finaliseAfterOperation(operationName, opId, name, lockAcquiredAt, startTime, overBudget);
        succeeded = true;
        return result;
      } catch (e) {
        this._logger.error(`Operation ${operationName} failed`, {
          collection: name,
          opId,
          error: e instanceof Error ? e.message : String(e)
        });
        throw e;
      } finally {
        if (lockAcquired) {
          this.releaseOperationLock(opId);
        }
        // Failures are already reported by the catch above; claiming completion here would
        // misrepresent a failed operation as finished.
        if (succeeded) {
          this._logger.info(`Operation ${operationName} complete`, { collection: name, opId });
        }
      }
    });
  }

  /**
   * Validate modification tokens match before operation
   * @param {string} localToken - Local collection metadata token
   * @param {string|null} remoteToken - Master index metadata token
   * @throws {ModificationConflictError} When tokens differ
   */
  validateModificationToken(localToken, remoteToken) {
    if (remoteToken !== null && remoteToken !== undefined && localToken !== remoteToken) {
      // Throw a specific modification conflict error when tokens differ
      throw new ErrorHandler.ErrorTypes.MODIFICATION_CONFLICT(
        this._collection.getName(),
        localToken,
        remoteToken,
        `Modification token mismatch for collection: ${this._collection.getName()}`
      );
    }
  }

  /**
   * Acquire lock with timeout mapping to coordination timeout error.
   * @param {string} opId - Operation identifier
   * @param {string} operationName - Operation name for error context
   * @param {string} collectionName - Collection name for logging
   * @returns {number} Timestamp recorded after the lock was acquired.
   * @throws {CoordinationTimeoutError} When lock acquisition times out; the thrown error carries
   *   the LOCK_ACQUISITION_TIMEOUT_REASON value in its context to distinguish the pre-callback
   *   site-0 throw from the other coordination timeout sites.
   * @throws {*} Any other lock acquisition failure, rethrown unchanged
   * @private
   */
  _acquireLockWithTimeoutMapping(opId, operationName, collectionName) {
    try {
      return this.acquireOperationLock(opId);
    } catch (e) {
      if (e instanceof ErrorHandler.ErrorTypes.LOCK_TIMEOUT) {
        this._logger.error('Lock acquisition timed out', {
          collection: collectionName,
          operationId: opId,
          timeout: this._config.coordinationTimeoutMs,
          reason: LOCK_ACQUISITION_TIMEOUT_REASON
        });
        throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(
          operationName,
          this._config.coordinationTimeoutMs,
          LOCK_ACQUISITION_TIMEOUT_REASON
        );
      }
      throw e;
    }
  }

  /**
   * Renew the lock lease when the operation is close to the expiry window.
   * @param {number|null} lockAcquiredAt - Timestamp recorded after lock acquisition.
   * @param {string} opId - Operation identifier.
   * @param {string} collectionName - Collection name for logging.
   * @returns {boolean} True when renewal was not required or succeeded; false when renewal was
   *   due and failed (the caller must attempt a single re-acquisition).
   * @private
   * @remarks No longer throws: the unified post-callback algorithm centralises all
   *   CoordinationTimeoutError throw decisions in coordinate()/_finaliseAfterOperation. A
   *   due-but-failed renewal emits a loud ERROR and reports false so ownership resolution can
   *   attempt exactly one re-acquisition.
   */
  _renewLeaseForFinalisationIfRequired(lockAcquiredAt, opId, collectionName) {
    if (!this._shouldRenewLease(lockAcquiredAt)) {
      return true;
    }

    const renewed = this._masterIndex.renewCollectionLock(
      collectionName,
      opId,
      this._config.collectionLockLeaseMs
    );
    if (renewed) {
      return true;
    }

    this._logger.error('Collection lock lease expired before finalisation could complete', {
      collection: collectionName,
      opId,
      leaseMs: this._config.collectionLockLeaseMs
    });
    return false;
  }

  /**
   * Attempt exactly one lease re-acquisition for finalisation after a renewal failure.
   * @param {string} collectionName - Collection name for logging and re-acquisition.
   * @param {string} opId - Operation identifier for the re-acquisition request.
   * @returns {boolean} True when the re-acquisition succeeded; false when it returned false or threw.
   * @private
   * @remarks No retry loop and no backoff: the unified policy permits a single re-acquisition
   *   attempt. A thrown error (e.g. CollectionNotFoundError) is treated identically to a false
   *   result so the caller routes to the lost-unrecoverable path. On success a loud WARN records
   *   the recovery so operators can correlate with the preceding renewal-failure ERROR.
   */
  _attemptSingleReacquisition(collectionName, opId) {
    try {
      const acquired = this._masterIndex.acquireCollectionLock(
        collectionName,
        opId,
        this._config.collectionLockLeaseMs
      );
      if (acquired) {
        this._logger.warn('Collection lock re-acquired for finalisation after renewal failure', {
          collection: collectionName,
          opId,
          outcome: 'recovered'
        });
      }
      return acquired;
    } catch {
      return false;
    }
  }

  /**
   * Resolve whether the coordinator still owns the lease before finalisation.
   * @param {string} opId - Operation identifier.
   * @param {string} collectionName - Collection name for logging.
   * @param {number|null} lockAcquiredAt - Timestamp recorded after lock acquisition.
   * @returns {string} 'intact' (renewal not required or succeeded), 'restored' (renewal failed but a
   *   single re-acquisition succeeded), or 'lost-unrecoverable' (re-acquisition returned false or threw).
   * @private
   * @remarks Renewal is attempted first (non-throwing boolean). On renewal failure exactly one
   *   re-acquisition attempt is made; a false return or a thrown error is treated uniformly as
   *   unrecoverable.
   */
  _resolveOwnership(opId, collectionName, lockAcquiredAt) {
    const renewalOk = this._renewLeaseForFinalisationIfRequired(
      lockAcquiredAt,
      opId,
      collectionName
    );
    if (renewalOk) {
      return 'intact';
    }

    const reacquired = this._attemptSingleReacquisition(collectionName, opId);
    if (reacquired) {
      return 'restored';
    }

    return 'lost-unrecoverable';
  }

  /**
   * Apply the unified post-callback violation algorithm: finalise metadata (or skip it) and
   * raise the appropriate CoordinationTimeoutError throw site.
   * @param {string} operationName - Operation name for error context.
   * @param {string} opId - Operation identifier.
   * @param {string} collectionName - Collection name for logging.
   * @param {number|null} lockAcquiredAt - Timestamp recorded after lock acquisition.
   * @param {number} startTime - Operation start timestamp captured once by coordinate().
   * @param {boolean} overBudget - True when the callback exceeded the coordination budget.
   * @returns {void}
   * @throws {CoordinationTimeoutError} When the lease is unrecoverable (site 3, reason
   *   'lease-not-recoverable') or when the operation overran the budget (site 2, reason
   *   'post-operation-overrun').
   * @private
   * @remarks Centralises the post-callback half of the unified violation algorithm. On a
   *   lost-unrecoverable ownership outcome finalisation is skipped and a loud divergence ERROR is
   *   logged before the primary CoordinationTimeoutError propagates. On an over-budget path a
   *   finalisation failure is swallowed with a loud ERROR so it cannot mask the primary timeout;
   *   the boundary catch also records the operation failure, giving two deliberate records for a
   *   violation-path operation. The elapsedMs read here is for the overrun log only and is not a
   *   second budget verdict.
   */
  _finaliseAfterOperation(operationName, opId, collectionName, lockAcquiredAt, startTime, overBudget) {
    const ownershipOutcome = this._resolveOwnership(
      opId,
      collectionName,
      lockAcquiredAt
    );
    if (ownershipOutcome === 'lost-unrecoverable') {
      this._logger.error('Metadata finalisation skipped; collection and master index may be divergent', {
        collection: collectionName,
        opId,
        operation: operationName
      });
      throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(
        operationName,
        this._config.coordinationTimeoutMs,
        LEASE_UNRECOVERABLE_REASON
      );
    }

    let finalisationOutcome = 'finalised';
    try {
      this.updateMasterIndexMetadata();
    } catch (finalisationError) {
      if (overBudget) {
        this._logger.error(
          'Metadata finalisation failed on a violation path; the coordination timeout propagates',
          {
            collection: collectionName,
            opId,
            error: finalisationError instanceof Error ? finalisationError.message : String(finalisationError)
          }
        );
        finalisationOutcome = 'finalisation-failed';
      } else {
        throw finalisationError;
      }
    }

    if (overBudget) {
      const elapsedMs = Date.now() - startTime;
      this._logger.error('Operation exceeded the coordination budget after effects were applied', {
        collection: collectionName,
        opId,
        timeoutMs: this._config.coordinationTimeoutMs,
        elapsedMs,
        finalisationOutcome
      });
      throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(
        operationName,
        this._config.coordinationTimeoutMs,
        POST_OPERATION_OVERRUN_REASON
      );
    }
  }

  /**
   * Determine whether the current operation is close enough to lease expiry to require renewal.
   * @param {number|null} lockAcquiredAt - Timestamp recorded after lock acquisition.
   * @returns {boolean} True when renewal should be attempted.
   * @private
   */
  _shouldRenewLease(lockAcquiredAt) {
    if (typeof lockAcquiredAt !== 'number') {
      return false;
    }

    const elapsedSinceLockMs = Date.now() - lockAcquiredAt;
    return elapsedSinceLockMs >= this._config.collectionLockLeaseMs - LEASE_RENEWAL_WINDOW_MS;
  }

  /**
   * Resolve conflicts if detected.
   * @param {string} collectionName - Collection name for logging
   * @private
   */
  _resolveConflictsIfPresent(collectionName) {
    if (this.hasConflict()) {
      this._logger.warn('Conflict detected, resolving', { collection: collectionName });
      this.resolveConflict();
    }
  }

  /**
   * Enforce the coordination budget before the operation callback runs.
   * @param {string} operationName - Operation name for error context.
   * @param {string} opId - Operation identifier for logging.
   * @param {string} collectionName - Collection name for logging.
   * @param {number} startTime - Operation start timestamp captured once by coordinate().
   * @returns {void}
   * @throws {CoordinationTimeoutError} When the budget is already exhausted before the callback.
   * @private
   * @remarks Single clock source: elapsed time is measured from the startTime captured at the top
   *   of coordinate() so the pre-flight verdict and the later over-budget verdict share one
   *   measurement. On violation the callback never runs because this check throws before the
   *   callback is invoked, so no operation side effects can occur.
   */
  _enforcePreflightBudget(operationName, opId, collectionName, startTime) {
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > this._config.coordinationTimeoutMs) {
      this._logger.error('Coordination budget exhausted before the operation callback', {
        collection: collectionName,
        opId,
        timeoutMs: this._config.coordinationTimeoutMs
      });
      throw new ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT(
        operationName,
        this._config.coordinationTimeoutMs,
        PREFLIGHT_BUDGET_EXHAUSTED_REASON
      );
    }
  }

  /**
   * Acquire operation lock with retry/backoff
   * @param {string} operationId - Unique operation identifier
   * @returns {number} Timestamp recorded after the lock was acquired.
   * @throws {LockAcquisitionFailureError} When lock cannot be acquired
   * @throws {*} For unexpected errors during lock acquisition, rethrown unchanged.
   */
  acquireOperationLock(operationId) {
    const name = this._collection.getName();
    const { retryAttempts, retryDelayMs, collectionLockLeaseMs, lockRetryBackoffBase } =
      this._config;

    let acquired = false;
    let lockAcquiredAt = null;
    let elapsedBackoffMs = 0;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const got = this._masterIndex.acquireCollectionLock(
          name,
          operationId,
          collectionLockLeaseMs
        );
        if (got) {
          acquired = true;
          lockAcquiredAt = Date.now();
          break;
        }
        // retry after backoff
        if (attempt < retryAttempts) {
          const backoffDelayMs = retryDelayMs * Math.pow(lockRetryBackoffBase, attempt - 1);
          if (elapsedBackoffMs + backoffDelayMs >= collectionLockLeaseMs) {
            break;
          }
          Utilities.sleep(backoffDelayMs);
          elapsedBackoffMs += backoffDelayMs;
        }
      } catch (e) {
        this._logger.error('Unexpected error during lock acquisition attempt', {
          collection: name,
          operationId,
          error: e.message
        });
        // Re-throw unexpected errors immediately, as they are not contention issues
        // and should not be handled by the standard retry/fail mechanism.
        throw e;
      }
    }
    if (!acquired) {
      this._logger.warn('Could not acquire lock after retries', { collection: name, operationId });
      // Throw specific error when lock acquisition fails
      throw new ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE(name);
    }
    return lockAcquiredAt;
  }

  /**
   * Release operation lock
   * @param {string} operationId - Unique operation identifier
   * @remarks Release failures are deliberately swallowed so they cannot mask the coordinated
   *   operation's own outcome, but the diagnostic log records the underlying error message.
   */
  releaseOperationLock(operationId) {
    const name = this._collection.getName();
    try {
      this._masterIndex.releaseCollectionLock(name, operationId);
    } catch (e) {
      this._logger.error('Lock release failed', {
        collection: name,
        operationId,
        error: e instanceof Error ? e.message : String(e)
      });
      // swallow release errors to avoid masking operation errors
    }
  }

  /**
   * Check whether local metadata token differs from master index
   * @returns {boolean} True if there is a conflict
   */
  hasConflict() {
    const name = this._collection.getName();
    const localToken = this._collection._metadata.getModificationToken();
    const masterMeta = this._masterIndex.getCollection(name);
    const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;
    return localToken !== remoteToken;
  }

  /**
   * Resolve a metadata conflict. Only reload is supported, so just reload.
   * @throws {*} Whatever the underlying collection reload throws (e.g. file access errors)
   */
  resolveConflict() {
    // Only reload is supported, so always reload
    this._collection._ensureLoaded();
  }

  /**
   * Update the master index with latest collection metadata
   * @returns {void}
   * @throws {MasterIndexError} When the metadata update fails on the within-budget path
   * @remarks Emits a DEBUG-gated coordinator.updateMasterIndexMetadata timing event through the
   *   component logger; the whole metadata update is timed as one unit. On the normal
   *   within-budget path failures are wrapped in a MasterIndexError WITHOUT logging here —
   *   failure logging is owned by coordinate's boundary catch, keeping exactly one diagnostic
   *   record per failure. On an over-budget violation path, however, the unified coordination
   *   algorithm additionally logs a point-of-occurrence error when this finalisation is
   *   swallowed, so the boundary catch is no longer the only record in that case.
   */
  updateMasterIndexMetadata() {
    return this._logger.timeSync('coordinator.updateMasterIndexMetadata', () => {
      const name = this._collection.getName();
      const meta = this._collection._metadata;
      const updates = {
        documentCount: meta.documentCount,
        modificationToken: meta.getModificationToken()
      };
      try {
        if (this._masterIndex.getCollection(name)) {
          this._masterIndex.updateCollectionMetadata(name, updates);
        } else {
          // Initial registration of new collection
          this._masterIndex.addCollection(name, meta);
        }
      } catch (e) {
        // Wrap only; on the within-budget path coordinate's catch owns the failure log entry.
        // On an over-budget path the algorithm logs a point-of-occurrence error around the
        // swallow and then propagates the primary CoordinationTimeoutError.
        throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('updateCollectionMetadata', e.message);
      }
    });
  }
}
