const request = require('superagent-relative');
const async = require('async');
const recastai = require('recastai');
const aiclient = new recastai.Client('bd8975c331f2800dd57a331b25e2cc9a','en');

const querySyntaxDB = require('./querySyntaxDB');
const queryOxygen = require('./queryOxygen');

// Seneca plugin for bob-bot
// listens to conversations.
// If its a greeting, it'll reply with a greeting
// If its a query about concepts, it will retrieve the conecpt from syntaxdb, as well as from oxygen
// If its a request for documents, it will fetch those documents from oxygen


module.exports = function() {
	const syntaxDBSupportedLanguages = ['c', 'c++', 'c#', 'java', 'javascript', 'python', 'ruby', 'swift', 'go'];
	const oxygenSupportedLangauges = ['java'];

	this.add('api:bot,impl:concepts-bot,intent:greeting', function(msg, done) {
		done(null, {reply: 'Hi. What can I do for you?'});
	});

	this.add('api:bot,impl:concepts-bot,intent:documentsearch', function({language, concept, requiredDetails}, done) {
		if(!language) {
			done(null, {reply: 'What language?'});
			return;
		}

		if(!concept) {
			done(null, {reply: 'What concept'});
		}

		const processes = [];
		// Check if programming language is supported by oxygen
		const isSupportedByOxygen = oxygenSupportedLangauges.indexOf(language.toLowerCase()) >= 0;

		// Query Oxygen
		if(isSupportedByOxygen) processes.push(queryOxygen.bind(null, {language, concept}));

		// Check if programming langauge is supported by SyntaxDB
		const isSupportedBySyntaxDB = syntaxDBSupportedLanguages.indexOf(language) >= 0;

		// Query SyntaxDB
		if(isSupportedBySyntaxDB) processes.push(querySyntaxDB.bind(null, {language, concept, requiredDetails}));

		async.parallel(processes, (err, results) => {
			if(err) { done(err); return }

			const oxygenResult = isSupportedByOxygen ? results[0] : null;
			const syntaxDBResult = isSupportedBySyntaxDB ? (isSupportedByOxygen ? results[1] : results[0]) : null;
			var reply = '';
			if(syntaxDBResult){
				reply = reply + syntaxDBResult.result + '\n';
			}
			if(oxygenResult){
				reply = reply + oxygenResult.result;
			}
			console.log('this is replyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy: ',reply)
			done(null, {reply: reply});
		});
	});
};


/*module.exports = function bobBot (options) {
  this.add('api:bot,impl:bob-bot', bobBotFn)

 	function bobBotFn (msg, done1) {
  		const done = (err, res) => {
	  		console.log('Done Called');
	  		done1(err, res);
	  	}
	  	var botReply = 'This is the bot replying';
	  	var syntaxDB = ['c', 'c++', 'c#', 'java', 'javascript', 'python', 'ruby', 'swift', 'go'];
	  	let oxyReply="";
	  	var botMsg = '';
	  	if(msg.data === 'ping'){
	  		return done(null, {
		      reply : 'pong'
		    })
	  	}
	  	else{
			aiclient.textConverse(msg.data)
			.then(function(res) {
			    let name=[];
			    if(res.entities.length>0){
			        for( let i=0;i<res.entities.length;i++){
			            name.push(res.entities[i].name);
			        }
			    }
			    console.log('Entities Recieved: ', res.entities)
			    if(res.entities.length===0){
			        botReply = 'Please give any domain name!!!!!!';
			        return done(null, {
				      reply : botReply
				    })
			    }
			    else if(res.entities[0].name==='wish'){
			        botReply =  res.reply();
			        return done(null, {
			  			reply : botReply
					})
			    }
			    else if(name.includes("concepts")){
			        var a=[];
			        var index=name.indexOf("concepts");
			        let b=res.entities[index].value;
			        console.log(b,"Domain Name");
			        var item = b.toLowerCase().charAt(0).toUpperCase()+b.toLowerCase().substr(1);
			        var language = item.toLowerCase();   
			        console.log('Language is: ', language);
			        if(syntaxDB.indexOf(language.toLowerCase())>=0){
			            var concept = res.entities[name.indexOf('topic')].value;
			            console.log('Topic is : ', concept);
			            if(name.indexOf('topic')>=0){
			                if(name.indexOf('requireddetails')>=0){
			                    var tempDetails = '';
			                    res.entities.map((item, i) =>{
			                        if(item.name === 'requireddetails'){
			                            tempDetails = tempDetails + item.value+',';
			                        }
			                    });
			                    tempDetails = tempDetails.slice(0, -1);
			                    console.log('temp details: ', tempDetails);
			                    var reqDetails = tempDetails.replace(/,/g, '%2C');
			                    var detCategory = tempDetails.split(',');
			                    detCategory.sort();
			                    console.log('Required details: ', reqDetails);
			                    request.get('https://syntaxdb.com/api/v1/languages/'+language+'/concepts/search?q='+concept+'&fields='+reqDetails+'&limit=1')
			                    .end((err, res) => {
			                        var syntaxdbResponse = JSON.parse(res.text);
			                        console.log('Response from syntaxDB: ', syntaxdbResponse[0]);
			                        var botMsg = '';
			                        var count = true;
			                        detCategory.forEach(function(element) {
			                            console.log('element: ', element)
			                            console.log('SyntaxDb response: ', syntaxdbResponse[0][element]);
			                            if(element === 'description'){
			                                botMsg = botMsg + '\n' + element.toUpperCase() +' :\n'  + syntaxdbResponse[0][element] + '\n' ;
			                            }
			                            else{
			                                var codeMark = count ? '```' : '';
			                                botMsg = codeMark + botMsg + '\n' + element.toUpperCase() + ':\n'  + syntaxdbResponse[0][element] + '\n' ;
			                                count = false;
			                            }
			                        });
			                        a.push(item);
			                        request.post("http://oxygen.blr.stackroute.in/domain/documents/Java").send(
			                        {"domainName": item, "reqIntents": [], "reqConcepts": a, "allIntents": ["Learning"]}
			                        ).end((req,res)=>{
			                            console.log("Success-----Oxygen's Response",res.body);          
			                            async.each(res.body,function(item,callback){
			                                oxyReply+=item.title+" "+item.url+"*#%&%#*";
			                                callback();
			                            },
			                            function(err){
			                                console.log("callback");
			                                console.log('OxyReply : ',  oxyReply);
											if(oxyReply == ''){
			                                    console.log('OxyReply is null or undefined')
			                                }
			                                else{
			                                	botMsg = botMsg + '\n' + 'Links:' + oxyReply;
			                                }
			                                botReply = botMsg;
						                    return done(null, {
										      reply : botReply
										    }) 
			                            })
			                        })
		                    	}) 
		                	}
		                	else{
			                    console.log('LALksljdasfdiudsufgdsugfyuggyud is ', language);
			                    console.log('concepsdyuf concept concept ', concept);
			                    request.get('https://syntaxdb.com/api/v1/languages/'+language+'/concepts/search?q='+concept+'&limit=1')
			                    .end((err, res) => {
			                        console.log('Response from syntax db ', res.text)
			                        var syntaxdbResponse = JSON.parse(res.text);
			                        console.log('Response from syntaxDB: ', syntaxdbResponse[0]);
			                        if(syntaxdbResponse[0]){
			                            //console.log('Response from syntaxDB: ',res);
			                            var botMsg = 'Working'
			                            var detCategory = ['description', 'syntax', 'example'];
			                            
			                            var count = true;
			                            detCategory.forEach(function(element) {
			                                console.log('element: ', element)
			                                console.log('SyntaxDb response: ', syntaxdbResponse[0][element]);
			                                if(element === 'description'){
			                                    botMsg = botMsg + '\n' + element.toUpperCase() +' :\n'  + syntaxdbResponse[0][element] + '\n' ;
			                                }
			                                else{
			                                    var codeMark = count ? '```' : '';
			                                    botMsg = codeMark + botMsg + '\n' + element.toUpperCase() + ':\n'  + syntaxdbResponse[0][element] + '\n' ;
			                                    count = false;
			                                }
			                            });  
			                        }
			                        else{
			                            botMsg = '';
			                        }		                        
			                        a.push(item);
			                        request.post("http://oxygen.blr.stackroute.in/domain/documents/Java").send(
			                        {"domainName": item, "reqIntents": [], "reqConcepts": a, "allIntents": ["Learning"]}
			                        ).end((req,res)=>{
			                            console.log("Success-----Oxygen's Response",res.body);          
			                            async.each(res.body,function(item,callback){
			                                oxyReply+=item.title+" "+item.url+"*#%&%#*";
			                                callback();
			                            },
			                            function(err){
			                                console.log("callback");
			                                console.log('OxyReply : ',  oxyReply);
			                                if(oxyReply ==''){
			                                	console.log('OxyReply is null or undefined')
			                                	console.log('This is botmsg', botMsg);
			                                }
			                                else{
			                                	console.log("Oxyreply has some value");
			                                	console.log('This is typeof botmsg', typeof botMsg);
			                                    botMsg = botMsg + '\n' + 'Links:' + oxyReply;
			                                    console.log('inside oxyreply addition')
			                                }
			                                if(botMsg == null || botMsg == undefined){
			                                    botMsg = 'Crap!! this is embarrasing!! Cannot find what you were looking for!';
			                                }
			                                console.log('Passed upto this point')
			                                console.log('THiiiiiiiiiiiiiiissssssssss waaaaaass botMsg : ', botMsg);
						                    botReply = botMsg;
						                    return done(null, {
										      reply : botReply
										    }) 
			                            })
			                        })
		                    	})
		                	}		                
			            }
			            else{
			                botReply = 'Please specify the concept!!';
			                return done(null, {
						      reply : botReply
						    })
			            }
		        	}
			        else{
			            a.push(item);
			            request.post("http://oxygen.blr.stackroute.in/domain/documents/Java").send(
			            {"domainName": item, "reqIntents": [], "reqConcepts": a, "allIntents": ["Learning"]}
			            ).end((req,res)=>{
			                console.log("Success-----Oxygen's Response",res.body);          
			                async.each(res.body,function(item,callback){
			                    oxyReply+=item.title+" "+item.url;
			                    callback();
			                },
			                function(err){
			                    console.log("callback");
			                    if(oxyReply == null || oxyReply == undefined){
			                        botReply = 'Crap!! this is embarrasing!! Cannot find what you were looking for!';
			                        return done(null, {
								      reply : botReply
								    })
			                    }
			                    else{
			                        botReply = {url:oxyReply,format:'oxygen'};
			                        return done(null, {
								      reply : botReply
								    })
			                    }
			                })
			            }) 
			        }
			    }
			    else{
			        botReply = 'What was the language  name???';
			        return done(null, {
				      reply : botReply
				    })
			    }
			})
		}
  	}
}*/
