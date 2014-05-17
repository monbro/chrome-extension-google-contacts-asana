'use strict';

var googleOAuthContacts = (function() {

  var STATE_START=1;
  var STATE_ACQUIRING_AUTHTOKEN=2;
  var STATE_AUTHTOKEN_ACQUIRED=3;

  var state = STATE_START;

  var signin_button, revoke_button, asana_button;

 function disableButton(button) {
    button.setAttribute('disabled', 'disabled');
  }

  function enableButton(button) {
    button.removeAttribute('disabled');
  }

  function changeState(newState) {
    state = newState;
    switch (state) {
      case STATE_START:
        enableButton(signin_button);
        disableButton(revoke_button);
        disableButton(asana_button);
        break;
      case STATE_ACQUIRING_AUTHTOKEN:
        var messageStr = 'Acquiring token...';
        addToLogger(messageStr);
        disableButton(signin_button);
        disableButton(revoke_button);
        disableButton(asana_button);
        break;
      case STATE_AUTHTOKEN_ACQUIRED:
        disableButton(signin_button);
        enableButton(revoke_button);
        enableButton(asana_button);
        break;
    }
  }

  // @corecode_begin getProtectedData
  function xhrWithAuth(method, url, interactive, callback) {
    var access_token;

    var retry = true;

    getToken();

    function getToken() {
      chrome.identity.getAuthToken({ interactive: interactive }, function(token) {
        if (chrome.runtime.lastError) {
          callback(chrome.runtime.lastError);
          return;
        }

        access_token = token;
        requestStart();
      });
    }

    function requestStart() {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
      xhr.onload = requestComplete;
      xhr.send();
    }

    function requestComplete() {
      if (this.status == 401 && retry) {
        retry = false;
        chrome.identity.removeCachedAuthToken({ token: access_token },
                                              getToken);
      } else {
        callback(null, this.status, this.response);
      }
    }
  }

  var contacts = null;

  function onContacts(error, status, response) {
    contacts = [];
    var data = JSON.parse(response);

    for (var i = 0, entry; entry = data.feed.entry[i]; i++) {
      var contact = {
        'name' : entry['title']['$t'],
        'id' : entry['id']['$t'],
        'emails' : []
      };

      if (entry['gd$email']) {
        var emails = entry['gd$email'];
        for (var j = 0, email; email = emails[j]; j++) {
          contact['emails'].push(email['address']);
        }
      }

      if (!contact['name']) {
        contact['name'] = contact['emails'][0] || "<Unknown>";
      }
      contacts.push(contact);
    }

    // trigger asana action
    asana(contacts);
};

  function getUserInfo(interactive) {
    xhrWithAuth('GET',
                // 'https://www.googleapis.com/plus/v1/people/me',
                'https://www.google.com/m8/feeds/contacts/default/full?alt=json&max-results=999',
                interactive,
                onContacts);
  }
  // @corecode_end getProtectedData


  // Code updating the user interface, when the user information has been
  // fetched or displaying the error.
  function onUserInfoFetched(error, status, response) {
    if (!error && status == 200) {
      changeState(STATE_AUTHTOKEN_ACQUIRED);
      sampleSupport.log(response);
      var user_info = JSON.parse(response);
      populateUserInfo(user_info);
    } else {
      changeState(STATE_START);
    }
  }

  // OnClick event handlers for the buttons.

  /**
    Retrieves a valid token. Since this is initiated by the user
    clicking in the Sign In button, we want it to be interactive -
    ie, when no token is found, the auth window is presented to the user.

    Observe that the token does not need to be cached by the app.
    Chrome caches tokens and takes care of renewing when it is expired.
    In that sense, getAuthToken only goes to the server if there is
    no cached token or if it is expired. If you want to force a new
    token (for example when user changes the password on the service)
    you need to call removeCachedAuthToken()
  **/
  function interactiveSignIn() {
    changeState(STATE_ACQUIRING_AUTHTOKEN);

    // @corecode_begin getAuthToken
    // @description This is the normal flow for authentication/authorization
    // on Google properties. You need to add the oauth2 client_id and scopes
    // to the app manifest. The interactive param indicates if a new window
    // will be opened when the user is not yet authenticated or not.
    // @see http://developer.chrome.com/apps/app_identity.html
    // @see http://developer.chrome.com/apps/identity.html#method-getAuthToken
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
      if (chrome.runtime.lastError) {
        sampleSupport.log(chrome.runtime.lastError);
        changeState(STATE_START);
      } else {
        var messageStr = 'Token acquired:'+token+'. See chrome://identity-internals for details.';
        addToLogger(messageStr);
        changeState(STATE_AUTHTOKEN_ACQUIRED);
      }
    });
    // @corecode_end getAuthToken
  }

  function revokeToken() {
    chrome.identity.getAuthToken({ 'interactive': false },
      function(current_token) {
        if (!chrome.runtime.lastError) {

          // @corecode_begin removeAndRevokeAuthToken
          // @corecode_begin removeCachedAuthToken
          // Remove the local cached token
          chrome.identity.removeCachedAuthToken({ token: current_token },
            function() {});
          // @corecode_end removeCachedAuthToken

          // Make a request to revoke token in the server
          var xhr = new XMLHttpRequest();
          xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                   current_token);
          xhr.send();
          // @corecode_end removeAndRevokeAuthToken

          // Update the user interface accordingly
          changeState(STATE_START);
          addToLogger('Token revoked and removed from cache. '+
            'Check chrome://identity-internals to confirm.');
        }
    });
  }

  function asanaImport() {
      getUserInfo(false);
  }

  return {
    onload: function () {
      signin_button = document.querySelector('#signin');
      signin_button.addEventListener('click', interactiveSignIn);

      revoke_button = document.querySelector('#revoke');
      revoke_button.addEventListener('click', revokeToken);

      asana_button = document.querySelector('#asana_contact_to_tasks');
      asana_button.addEventListener('click', asanaImport);


      logger_area = document.querySelector('#logger');

      asanaApiKey = document.getElementById("asana_apikey");

      asanaApiKey.onblur = function(evt) {
          evt = evt || window.event;
          if(asanaApiKey.value.length >= 20) {

            token = asanaApiKey.value;

            getWorkspaces(function(data) {
              var asana_workspaces = document.querySelector('#asana_workspace');

              // clean up the select
              while (asana_workspaces.firstChild) {
                  asana_workspaces.removeChild(asana_workspaces.firstChild);
              }

              var opt = document.createElement('option');
              opt.value = '';
              opt.innerHTML = '';
              asana_workspaces.appendChild(opt);

              for (var i = data.data.length - 1; i >= 0; i--) {
                var opt = document.createElement('option');
                opt.value = data.data[i]['id'];
                opt.innerHTML = data.data[i]['name'];
                asana_workspaces.appendChild(opt);
              };

              $('#asana_workspaces').show();

            });
          }
      };

      $('#asana_workspace').change(function(){
        if($(this).val().length > 0) {

          projectId = $(this).val();
          getProjects(function(data) {
              var asana_project = document.querySelector('#asana_project');

              // clean up the select
              while (asana_project.firstChild) {
                  asana_project.removeChild(asana_project.firstChild);
              }

              var opt = document.createElement('option');
              opt.value = '';
              opt.innerHTML = '';
              asana_project.appendChild(opt);

              for (var i = data.data.length - 1; i >= 0; i--) {
                var opt = document.createElement('option');
                opt.value = data.data[i]['id'];
                opt.innerHTML = data.data[i]['name'];
                asana_project.appendChild(opt);
              };
          });
        } else {
          $('#asana_workspace_info').html('please select!');
          $('#asana_projects').hide();
        }
      });

      $('#asana_project').change(function(){
        if($(this).val().length > 0) {
          asanaProjectId = $(this).val();

          $('#asana_project_info').html('ok!');
        } else {
          $('#asana_project_info').html('please select!');
        }
      });

      // Trying to get user's info without signing in, it will work if the
      // application was previously authorized by the user.
    }
  };

})();

window.onload = googleOAuthContacts.onload;

