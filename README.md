# JsonDbApp

A document database implemented in Google Apps Script using the Google Drive API with no external dependencies. Capable of storing any serialisable data in a JSON file. Supports a limited subset of MongoDB syntax for CRUD operations on named collections, with data consistency managed through a ScriptProperties-based master index. It is designed to be as performant as possible within the constraints of Google Apps Script, minimising API calls and storing relatively large chunks of data in memory when querying or manipluating data.

Create it by simply making a copy of the [JsonDbApp AppScript Project](link goes here later), deploying it as a library, and then using it in your own Apps Script projects.

Once connected, intialiase the databse with:

```javascript
JsonDbApp.initialise({
  appName: 'MyApp',
  lockTimeout: 5000, // Optional, defaults to 5000ms
  masterIndexName: 'myMasterIndex' // Optional, defaults to 'masterIndex'
});
```

Create a collection with:

```javascript
JsonDbApp.createCollection('myCollection');
```

Add to that collection by storing any class with `toJSON()` and `fromJSON()` methods:

```javascript
JsonDbApp.insert('myCollection', myObject);
```

## Who is this for?

- You want a database with no external dependencies.
- You want to develop a project in GAS which handles sensitive data without having to worry about external data security.
- You don't want to be endlessly debugging issues with transforming data structures to fit into a spreadsheet.
- Your datasets are relatively small (collections no larger than 2GB so as not to exceed the GAS memory limits)
- Traffic for your app is relatively low.


## But whhhyyyy?

Lots of reasons! Some of them good, some of them less so. The main ones are:

- **Avoid transforming data structures to fit on a Google Sheet**: Implementing an entire DBMS felt less painful somehow.
- **You can't just hoik your data into a proper database**: I am a teacher, which means that my students data needs to be subject to additional safeguards. I can't just throw it at whatever free database service I find and I don't have the budget to pay for a proper one. `JsonDbApp` keeps all data within my institution's Google Workspace instance and requires no external services.
- **You've normalised your class structures already, dammit!**: And you'll be damned if you have to noramlise them to fit into a relational database, or worse, a spreadsheet.
