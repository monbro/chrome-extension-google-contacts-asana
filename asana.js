var token,
    contacts,
    logger_area,
    asanaApiKey,
    asanaProjectId,
    projectId,
    logText = '';

function addToLogger(s) {
  var currentdate = new Date();
  logText += '['+currentdate.getHours()+':'+currentdate.getMinutes()+':'+currentdate.getSeconds()+'] '+s+'\n';
  logger_area.innerText = logText;
}

function getWorkspaces(callback) {

    var asanaWorkspacesUrl = 'https://app.asana.com/api/1.0/workspaces';
      $.ajax( {
          url : asanaWorkspacesUrl,
          dataType : 'json',
          beforeSend : function(xhr) {
              xhr.setRequestHeader('Authorization', 'Basic ' + btoa(token + ":"));
          },
          success: function(data) {
            apikeyinfo.innerText = 'ok!';
            callback(data);
          },
          error: function (jqXHR,  textStatus,  errorThrown) {
            console.log(jqXHR, textStatus, errorThrown);
            var apikeyinfo = document.querySelector('#apikeyinfo');
            apikeyinfo.innerText = 'invalid key!';
            $('#asana_workspaces').hide();
            $('#asana_projects').hide();
          }
        }
      );
}

function getProjects(callback) {
  var asanaProjectsUrl = 'https://app.asana.com/api/1.0/workspaces/'+projectId+'/projects';
  $.ajax( {
      url : asanaProjectsUrl,
      dataType : 'json',
      beforeSend : function(xhr) {
          xhr.setRequestHeader('Authorization', 'Basic ' + btoa(token + ":"));
      },
      success: function(data) {
        $('#asana_workspace_info').html('ok!');
        callback(data);
        $('#asana_projects').show();
      },
      error: function (jqXHR,  textStatus,  errorThrown) {
        console.log(jqXHR, textStatus, errorThrown);
        $('#asana_workspace_info').html('something went wrong!');
        $('#asana_projects').hide();
      }
    }
  );
}

// Run our script as soon as the document's DOM is ready.
function asana(c) {
    // asana api request
    meUrl = 'https://app.asana.com/api/1.0/users/me';

    contacts = c;

    addToLogger('Got '+contacts.length+' Google Contacts to process...');

    if(contacts.length > 0) {
      worker(0);
    } else {
      addToLogger('Nothing to import!');
    }
}

function worker(counter) {
  addContactAsTask(contacts[counter], function() {
    counter = counter+1;
    // if(counter < contacts.length) {
    if(counter < 8) {
      var messageStr = 'Importing contact '+counter+': '+getContactHeadline(contacts[counter]);
      addToLogger(messageStr);
      progressDisplay(counter);
      worker(counter);
    }
  });
}

function progressDisplay(counter) {
  var perc = counter / contacts.length * 100;
  $('#progress').html(perc.toFixed(0)+' % completed');
}

function getContactHeadline(contact) {
   if(contact.name && contact.emails[0] && (contact.name !== contact.emails[0])) {
      name = contact.name+' - '+contact.emails[0];
    } else if(contact.name) {
      name = contact.name;
    } else if(contact.emails[0]) {
      name = contact.emails[0];
    }
    return name;
}

function addContactAsTask(contact, successCallback) {
      var newUrl = 'https://app.asana.com/api/1.0/workspaces/498346170860/tasks',
          name = getContactHeadline(contact);

      // create task
      $.ajax( {
          url : newUrl,
          type: 'POST',
          data: {
              "name": name
          },
          dataType : 'json',
          beforeSend : function(xhr) {
              xhr.setRequestHeader('Authorization', 'Basic ' + btoa(token + ":"));
          },
          success: function(data) {

            var resp = data.data;
            var taskId = resp.id;

            addTaskToProject(taskId, contact, asanaProjectId, successCallback);

          },
          error: function (jqXHR,  textStatus,  errorThrown) {
            console.log(jqXHR, textStatus, errorThrown);
          }
        }
      );
}

function addTaskToProject(taskId, contact, projectId, successCallback) {
  // add task to project now
  var addTaskToProjectUrl = "https://app.asana.com/api/1.0/tasks/"+taskId+"/addProject";
  $.ajax( {
    url : addTaskToProjectUrl,
    type: 'POST',
    data: {
        "project": projectId
    },
    dataType : 'json',
    beforeSend : function(xhr) {
        xhr.setRequestHeader('Authorization', 'Basic ' + btoa(token + ":"));
    },
    success: function(data) {
      addCommentToTask(taskId, contact.id, successCallback);
    },
    error: function (jqXHR,  textStatus,  errorThrown) {
      console.log(jqXHR, textStatus, errorThrown);
    }
  });
}

// http://developer.asana.com/documentation/#stories.comment
function addCommentToTask(taskId, text, successCallback) {

  // add task to project now
  var url = "https://app.asana.com/api/1.0/tasks/"+taskId+"/stories";
  $.ajax( {
    url : url,
    type: 'POST',
    data: {
        "text": text
    },
    dataType : 'json',
    beforeSend : function(xhr) {
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(token + ":"));
    },
    success: function(data) {
      successCallback();
    },
    error: function (jqXHR,  textStatus,  errorThrown) {
      console.log(jqXHR, textStatus, errorThrown);
    }
  });
}
