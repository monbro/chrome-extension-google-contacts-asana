chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html',
    { "id": "identitywin",
      "bounds": {
        "width": 620,
        "height": 800
      }
    });
});
