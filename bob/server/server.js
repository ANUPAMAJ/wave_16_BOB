var Seneca = require('seneca')

Seneca({tag: 'api'})
  .test('print')
  .use('consul-registry', {
    host: 'consul'
  })
  .use('mesh', {
    host: '@eth0',
    discover: {
      registry: {
        active: true
      },
      multicast: {
        active: false
      }
    }
  })
  
  .ready(function (){
    const express = require('express')
        , app = express()
        , bodyParser = require('body-parser')
        , cookieParser = require('cookie-parser')
        , path = require('path')
        , server = require('http').Server(app)
        , io = require('socket.io').listen(server)
        , client = require('./connections/redisclient.js')
        , mongoose = require('mongoose')
        , socket = require('./sockets/socket.js')
        , db = require('./connections/dbconnect.js');
        var static=require('express-static'),
         GoogleAToken = require('./model/googleatoken.schema.js'),
         OutlookToken = require('./model/outlooktoken.schema.js');
    //Routers
    const TilesRouter = require('./routes/tiles.routes.js')
        , DbRouter = require('./routes/db.routes.js')
        , githubRouter = require('./routes/githubAuth.routes.js')
        , googleRouter = require('./routes/googleAuth.routes.js')
        , outlookRouter = require('./routes/outlookAuth.routes.js')
        var seneca = this
        var _ = require('lodash');
        var merge = require('lodash/merge')



    app.set('json spaces', 2);
    app.get('/api/calendar/:impl', function(req, res){      
      seneca.act(
        {
          api: 'calendar',
          impl: req.params.impl,
          info :{
            name:req.query.name,
            details : JSON.parse(req.query.details),
            token : JSON.parse(req.query.tok)
          }
        },
        function(err, out)
        {
          res.json(err || out)
        }
      )
    })
    app.get('/api/available/:api', function(req, res){

     if(req.params.api === 'all'){
        var apiList = seneca.list('api:"*"')
        var listLength = apiList.length;
        console.log('Inside all available api')
        if(listLength == 0){
          res.json('No api services running!!')
        }
        else{
          for(let i = 0; i< listLength; i++){
            seneca.act(
              {
                api: apiList[i].api,
                impl: apiList[i].impl
              },
              function(err, out){
                if(err){
                  apiList.splice(i, 1);
                }
                else{
                  if(out.eraro){
                    apiList.splice(i, 1);
                  }
                }
                res.json(apiList);
              }
            )
          }
        }
      }
      else{
        var apiList = seneca.list('api:'+req.params.api);
        var listLength = apiList.length;
        if(listLength == 0){
          res.json('Sorry no '+req.params.api+' services available.')
        }
        else{
          for(let i = 0; i< listLength; i++){
            seneca.act(
              {
                api: apiList[i].api,
                impl: apiList[i].impl
              },
              function(err, out){
                if(err){
                  apiList.splice(i, 1);
                }
                else{
                  if(out.eraro){
                    apiList.splice(i, 1);
                  }
                }
                res.json(apiList);
              }
            )
          }
        }
      }
    })

   app.get('/api/bot/:botName/:sentence', function(req, res){
      seneca.act(
        {
          api: 'bot',
          impl: req.params.botName,
          cmd: 'extractIntent',
          sentence: req.params.sentence
        },
        function(err, out){
          //res.json(err || out)
          var entitiesList = {};
          out.entities.map((item, i) =>{
            if(item.name === 'topic'){
              entitiesList.topic=item.value;
            }
            if(item.name === 'programming_language'){
              entitiesList.programming_language=item.value;
            }
            if(item.name === 'requireddetails'){
              if(entitiesList.requireddetails){
                entitiesList.requireddetails = entitiesList.requireddetails + ','+ item.value;
              }
              else{
                entitiesList.requireddetails = item.value;
              }              
            }
          });
          //res.json(entitiesList)
          seneca.act(            
            'api:bot,impl:concepts-bot,intent:'+out.action.slug+'',
            {concept:entitiesList.topic, language:entitiesList.programming_language, requiredDetails:entitiesList.requireddetails},
            function(err, out){
              res.json(err || out)
            }            
          )              
        }
      )
    })
    app.get('/api/authentication/:impl',function(req,res){
      seneca.act({
          api:'auth',
          impl:req.params.impl,
          info:{
            codes:req.query.code,
            states:req.query.state
          }
      },function(err,out){
        if(err){
          console.log("error")
        }
        else{
           if(req.params.impl === 'outlook'){
           let token = new OutlookToken({
                    username : req.query.state,
                    token:out.url
                });
                token.save(function(err, rply) {
                    if (err) {
                        console.log("error in saving OutlookToken");
                    } else {
                        console.log("Successfully  saved in OutlookToken");
                    }
                })
          }
          else if(req.params.impl === 'google'){
              let newToken = new GoogleAToken({
                username : req.query.state,
                token: out.url
                });
              newToken.save(function(err){
                if(err)console.log("Error saving token to database!!");
                else console.log("Token saved successfully");
              });
          }
      }
        });
      });
   

    app.get('/api/information/:impl', function(req, res){
      var repInfo='';
      var repAuth='';
      var reply='';
      seneca.act(
        {
          api: 'info',
          impl: req.params.impl
        },
        function(err, out)
        {
          repInfo = (err || out)
          console.log("repInfo: ", repInfo)
          seneca.act(
            {
              api: 'auth',
              impl: req.params.impl
            },
            function(err, out)
            {
              repAuth = (err || out)
              console.log("repAuth: ", repAuth)
              reply = _.merge(repInfo, repAuth)
              res.json(reply)
            }
          )
        }
      )
    })

    //app
    console.log(path.resolve(__dirname+'/../'));
    app.use('/static',express.static(path.resolve(__dirname+'/../')));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      //console.log(req.body, "this is the body of request");

      next();
    });
    app.use('/', TilesRouter);
    app.use('/', DbRouter);
    app.use('/', githubRouter);
    app.use('/', googleRouter);    
    app.use('/', outlookRouter);
    app.get('/', function(req, res) {
        //console.log("got a request");
        //res.send("Got");
        res.sendFile(path.resolve(__dirname + "/../index.html"));
    });
    app.get('/index.js', function(req, res) {
        //console.log("got a request");
        res.sendFile(path.resolve(__dirname + "/../index.js"));
    });

    //MongoDB connection ---------->
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        // we're connected!
    });
    //Redis connection ---------->
    client.on('connect', function() {
        console.log('Connected');
    });
    //Socket Server ---------->
    server.listen(8000, function() {
        console.log('server started on  8000');
    });
    //Socket.io connection ---------->
    io.on('connection', socket.bind(null, io));
    
  })