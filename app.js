/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */

'use strict';

require( 'dotenv' ).config( {silent: true} );

var express = require( 'express' );  // app server
var bodyParser = require( 'body-parser' );  // parser for post requests
var Watson = require( 'watson-developer-cloud/conversation/v1' );  // watson sdk
var funciones_wex = require('./js/wex.js')
var app = express();

//Inicializamos a true - prueba
marcador_primera_vez=true;

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper
var conversation = new Conversation({
  // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  username: '91c96d26-075a-4fae-aafd-c73095a5c848',
  password: 'pWZ5SMCv68Y2',
  url: 'https://gateway-fra.watsonplatform.net/conversation/api',
  version_date: Conversation.VERSION_DATE_2017_04_21
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Endpoint utilizado cada vez que en el front pulsamos "enviar mensaje". Originalmente sólo llamaría a conversation
//en este caso, según el flujo, la primera vez llama a WEX sin llegar a ir a conversation
app.post('/api/message', function(req, res) {
  var workspace = process.env.WORKSPACE_ID || '7842e876-1340-42e4-8d0f-59136a993e15';
  if (!workspace || workspace === '7842e876-1340-42e4-8d0f-59136a993e15') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  // LLAMADA A WEX LA PRIMERA VEZ

  if(marcador_primera_vez==true){ //Debemos saber que es la primera vez, gracias a algún marcador que pueda venir de conversation
    funciones_wex.request(payload.input.text,function(err,datos){ //Uso de la funcion request construida en wex.js o similar, recibe los datos en callback "datos"
      if(datos.facetas){ //En la respuesta de WEX, si existen facetas por ejemplo, las metemos en el objeto que irá a conversation
        payload.context.facetas = datos.facetas
        conversation.message(payload,function(err,data){ //llamada a conversation, que hará algo en función de si "facetas" está relleno o no
          return res.json(data)
        });
      }
    })


  }else{ //Si no está activado el marcador de la primera vez, directamente vamos a conversation
    // Send the input to the conversation service
    conversation.message(payload, function(err, data) {
      if (err) {
        return res.status(err.code || 500).json(err);
      }
      else if(marcador_cambio_tema==true){  //Caso del flujo en el que hay cambio de tema y es necesario volver a encontrar "facetas", como la primera vez
        funciones_wex.request(data.input.text, function(err,datos){ //llamada a wex
          payload.context.facetas = datos.facetas
          conversation.message(payload,function(err,data){
            return res.json(data)
          })
        })
      }
      else if(marcador_busqueda_wex==true){ //Trigger para una búsqueda WEX
        funciones_wex.request(busqueda,function(err,datos){
          data.context.lista_pelis = datos.lista_pelis //ejemplo
          return res.json(data);
        })
      }
      else{ //Caso normal de llamada a conversation sin marcadores
        return res.json(data);
      }
    });
  }
});


module.exports = app;
