var DEBUG = true;
// var BASE_URL = 'https://local.close.io:5001/api/v1/'
var BASE_URL = 'https://app.close.io/api/v1/';

function getAuthType() {
  var response = { type: 'NONE' }; // KEY
  return response;
}

/**
 * Builds the Community Connector config.
 * @return {Config} The Community Connector config.
 * @see https://developers.google.com/apps-script/reference/data-studio/config
 */
function getConfig() {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();

  config.newInfo()
      .setId('instructions')
      .setText('Enter Close.io credentials information.');

  config.newTextInput()
      .setId('api_key')
      .setName('Enter API Key.')
      .setHelpText('api_key must be provided by close.io')
      .setPlaceholder('API Key Here')
      .setAllowOverride(true);

  config.setDateRangeRequired(true);
  
  return config.build();
}

/**
 * Builds the Community Connector fields object.
 * @return {Fields} The Community Connector fields.
 * @see https://developers.google.com/apps-script/reference/data-studio/fields
 */
function getFields(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  fields.newDimension()
      .setId('name')
      .setName('Name')
      .setDescription('Name of the individual contact.')
      .setType(types.TEXT);

  fields.newDimension()
      .setId('title')
      .setName('Title')
      .setDescription('Occupational title of the contact.')
      .setType(types.TEXT);
  
  fields.newDimension()
      .setId('created_by')
      .setName('Created By')
      .setType(types.TEXT);
  
  fields.newDimension()
      .setId('date_updated')
      .setName('Date Updated')
      .setType(types.TEXT);

  fields.newDimension()
      .setId('organization_id')
      .setName('Organization Id')
      .setType(types.TEXT);
  
  fields.newDimension()
      .setId('phone')
      .setName('Phone')
      .setDescription('Preferred phone number of the contact.')
      .setType(types.TEXT);
 
   fields.newDimension()
      .setId('email')
      .setName('Email')
      .setDescription('Preferred email address of the contact.')
      .setType(types.TEXT);
 
  return fields;
}

/**
 * Builds the Community Connector schema.
 * @param {object} request The request.
 * @return {object} The schema.
 */
function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}

function getData(request) {

  // Create schema for requested fields
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);
  
  // Fetch and parse data from API
  var url = [
    BASE_URL + 'contact/',
  ];
  
  var headers = {
    // Authorization: 'Token: ' + request.configParams.api_key,
    Authorization: "Basic " + Utilities.base64Encode(request.configParams.api_key + ":"),
  };
  
  var options = {
    'method' : 'get',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    // 'payload' : JSON.stringify({})
    'headers': headers,
  };
  
  var response = UrlFetchApp.fetch(url.join(''), options);
  
  if (DEBUG) {
    console.log('Response', response);
  }

  var parsedResponse = JSON.parse(response);
  
  // Transform parsed data and filter for requested fields
  var rows = responseToRows(requestedFields, parsedResponse);

  if (DEBUG) {
    console.log('Rows', rows);
  }
  
  return {
    schema: requestedFields.build(),
    rows: rows
  };
}

function isAdminUser() {
  // If this function’s value is true then when connector crashes for some reason it’ll display the full error message to the user.
  return true;
}

function responseToRows(requestedFields, response) {
  // Transform parsed data and filter for requested fields
  return response.data.map(function(contact) {
    var row = [];
    requestedFields.asArray().forEach(function (field) {
      var key = field.getId()
      
      if(key in contact){
        return row.push(contact[key])
      } else {
        switch(key){
          case 'phone':
            if (contact.phones && contact.phones.length) {   
              // not empty
              return row.push(contact.phones.shift()[key]);
            } else {
              return row.push('');
            }
            break;
          case 'email':
            if (contact.emails && contact.emails.length) {   
              // not empty
              return row.push(contact.emails.shift()[key]);
            } else {
              return row.push('');
            }
            break;
          default:
            return row.push('');
        }
      }
      
//      switch (field.getId()) {
//        case 'name':
//          return row.push(contact.name);
//        case 'title':
//          return row.push(contact.title);
//        default:
//          return row.push('');
//      }
      
    });
    return { values: row };
  });
}