const request = require('superagent-relative');

function queryOxygen({language, concept}, done) {
	
	// request.post("http://oxygen.blr.stackroute.in/domain/documents/Java").send(
 //    {"domainName": language, "reqIntents": [], "reqConcepts": concept, "allIntents": ["introduction"]}
 //    ).end((err, res)=>{
 //    	console.log('Inside queryOxygen: ', res);
 //    });

	// done(null, {result: 'oxygen'});
}

module.exports = queryOxygen;