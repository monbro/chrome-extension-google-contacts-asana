chrome-extension-google-contacts-asana
======================================

Import all google contacts as tasks into a asana project

## Google Contacts to Asana Project Tasks

A simple extension to import all your [google contacts](https://www.google.co.uk/contacts/) as tasks into one project of one workspace. The name of the task will be choosen depending on the available information of the contact. To have something to macht afterwards again between both API's, the google contacts id will be stored as the first comment for all tasks.

![Preview](/detail.png?raw=true "Preview")

## Getting started

1. clone this repo or download it
2. [load the extension into chrome](https://developer.chrome.com/extensions/getstarted#unpacked)
3. press the launch link next to the extension
4. follow the steps in the popup window

## Security

This extension does not use any custom server, it runs in your browser and will work with the google and asana API's only.

## Todo

* having a sync function to update the task that was created from a contact

## APIs

* [Asana](http://developer.asana.com/documentation/#Reference)
* [Google Identity](http://developer.chrome.com/apps/app.identity.html)
* [Google Runtime](http://developer.chrome.com/apps/app.runtime.html)
* [Google Window](http://developer.chrome.com/apps/app.window.html)

## Note

* yes, the current codebase of this prototype is a real beauty ;-)
