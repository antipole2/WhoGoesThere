/* Version 1.1 main changes
*	adds tracing option
* 	copes with no NMEA0183
*	canboat includes multiple versions of somePGNs.  Script now listens for only one of each PGN
*	improved handling of decode errors
*/

listen = 30;	// seconds to listen for
var NMEA2000Decode = false;
scriptName = "WhoGoesThere";
consoleName(scriptName);

trace = false;
scriptVersion = 1.1;	// needto update in repo
// require("checkForUpdate")(scriptName, scriptVersion, 5, "https://raw.githubusercontent.com/antipole2/WhoGoesThere/main/version.JSON");

var logN2Kpayloads = false;	// log N2K payloads to file
var payloads = [];

var descriptors;
var NMEA0183handles = [];		// the NMEA0183 connection handles, if any
var NMEA2000handles = [];		// the NMEA2000 connection handles, if any
listConnections();
haveNMEA0183 =  (NMEA0183handles.length > 0)?true:false;
haveNMEA2000 =  (NMEA2000handles.length > 0)?true:false;
NMEA2000buffer = {};
NMEA2000Counts = {};
if (haveNMEA2000){
	NMEA2000 = require("NMEA2000");
	//setup listening to responses to PGN59904
	pgnToSend = 59904;
	nmea59904 = new NMEA2000(pgnToSend);
	pgnToReceive = 126996;
	nmea59904.pgn = pgnToReceive;	// pgn to request
	id126996 = OCPNonAllNMEA2000(receive126996, pgnToReceive);	// listen out
	if (trace) printOrange("Listening for PGN126996 on id ", id126996, "\n");
	outcome = nmea59904.push();
	print("Sent PGN59904 - send outcome ", outcome, "\n");
	
	// listen for all NMA2000 and count
	descriptors = require("pgnDescriptors")();
	if (trace) {
		printOrange("Number of descriptors: ", descriptors.length,"\n");
		for (d = 0; d < descriptors.length; d++){
			printOrange(descriptors[d].PGN, " ");
			}
		printOrange("\n");
		}
	var pgnsSeen = [];
	for (d = 0; d < descriptors.length; d++){
		pgn = descriptors[d].PGN;
		if (pgnsSeen.indexOf(pgn) >= 0) continue; // already seen this one
		;
		id = OCPNonAllNMEA2000(gotNMEA2000, pgn);
		if (trace) printOrange("Listening for PGN", pgn, " on id ", id, "\n");
		pgnsSeen.push(pgn);
		}
	}
else print("No NMEA2000 connection\n");
responses = 0;
payloads = [];	

if (haveNMEA0183) OCPNonAllNMEA0183(logNMEA0183);
else print("No NMEA0183 connection\n");
if (!haveNMEA0183 && !haveNMEA2000) throw("No connections configured");
print("\nListening for ", listen, " seconds");
onAllSeconds(tick, 1);
onSeconds(report, listen);
onCloseButton(report);

function report(){
	if (trace) printOrange("In report\n");
	timeAlloc(2000);
	onSeconds();	// cancel all timers and listeners
	OCPNonNMEA0183();
	OCPNonNMEA2000();
	print("\n\n");
	listMessageNames();
	listNMEA0183();
	if (haveNMEA2000){
		list126996();
		listNMEA2000();
		}
	stopScript("End of report");
	}

function gotNMEA2000(payload){
	if (trace) printOrange("In gotNMEA2000\n");
	pgn = getBytes(payload, 3, 3);	// extract the pgn
	NMEA2000buffer[pgn] = payload;
	if (typeof NMEA2000Counts[pgn] == "undefined") NMEA2000Counts[pgn] = 1;
	else NMEA2000Counts[pgn]++;
	//	printBlue("NMEA2000 count is ", NMEA2000buffer.length, "\n");
	}

function getBytes(v, start, bytes){	// little endean!
	offset = start+bytes-1;
	result = v[offset--];
	for ( ; offset >= start; offset--){
		// result = (result << 8) | v[offset];  shift uses 32 bits, so to be 64 bit safe we use...
		result = (result * 256) + v[offset];
		}
	return result;
	};

function tick(){
	print(".");
	}

function listConnections(){
	printUnderlined("Active connections\n");
	handles = OCPNgetActiveDriverHandles();
	for (var h = 0; h < handles.length; h++){
		print(handles[h], "\n");
		attributes = OCPNgetDriverAttributes(handles[h]);
		print("\t", attributes, "\n");
		print(JSON.stringify(attributes, null, "\t"), "\n");
		if (attributes.protocol == "nmea0183") NMEA0183handles.push(handles[h]);
		if (attributes.protocol == "nmea2000") NMEA2000handles.push(handles[h]);
		}
	}

function listMessageNames(){
	printUnderlined("OpenCPN messages received since plugin started\n");
	print(OCPNgetMessageNames());
	}

NMEA0183buffer = {};
NMEA0183Counts = {};

function logNMEA0183(input){
	if (trace) printOrange("In logNMEA0183\n");
	if (input.OK){
		sentence = input.value;
		code = sentence.slice(0, 5);
		NMEA0183buffer[code] = sentence;
		if (typeof NMEA0183Counts[code] == "undefined") NMEA0183Counts[code] = 1;
		else NMEA0183Counts[code]++;
		}
	}

function listNMEA0183(){
	OCPNonNMEA0183();
	printUnderlined("\nNMEA0183 samples\n");
	printBlue("Counts\tSentence\n");
	const keys = Object.keys(NMEA0183buffer);
	if (keys.length < 1){
		print("(None)\n");
		return;
		}
	keys.sort(function sortOrder(a, b){
			if (a.slice(3,6) > b.slice(3,6)) return 1;
			if (a.slice(3,6) < b.slice(3,6)) return -1;
			if (a.slice(1,3) > b.slice(1,3)) return 1;
			if (a.slice(1,3) < b.slice(1,3)) return -11;
			return 0;
			});
	for (var k = 0; k < keys.length; k++)	print(NMEA0183Counts[keys[k]], "\t\t", NMEA0183buffer[keys[k]], "\n");
	}

function listNMEA2000(){
	OCPNonNMEA2000();
	printUnderlined("\nNMEA2000 samples\n");
	const keys = Object.keys(NMEA2000buffer);
	if (keys.length < 1){
		print("(None)\n");
		return;
		}
	if (logN2Kpayloads) fileToWrite = require("File")("??", WRITE_EXCL);
	printBlue("Counts\tSource\tPGN\n");
	for (var k = 0; k < keys.length; k++){
		var decodeOK;
		decoder = new NMEA2000(keys[k]*1);
		payload = NMEA2000buffer[keys[k]];
		if (logN2Kpayloads){
			toWrite = {PGN:keys[k]*1, payload:payload};
			fileToWrite.writeText(JSON.stringify(toWrite)+ "\n");
			}
		try {
			decoded = decoder.decode(payload); // replace payload with object
			decodeOK = true;
			print(NMEA2000Counts[keys[k]], "\t\t", payload[7], "\t\t", keys[k], "\t", decoded.descriptor.Description, "\n");
			}
		catch(err){
			// decode failed - look it up the hard way
			decodeOK = false;
			pgn = keys[k];
			description = "No description found";
			for (var d = 0; d < descriptors.length; d++){
				if (pgn == descriptors[d].PGN){
					description = descriptors[d].Description;
					break;
					}
				}
			switch (typeof err){
				case "string": message = err; break;
				case "undefined": message = "undefined"; break;
				case "object": {
					if (typeof err.message != "undefined") message = err.message;
					else message = "unknown catch error type 1";
					break;
					}
				default: message = "unknown catch error type 2";
				}
			printOrange("Decoding pgn ", pgn, " ", description, " failed ", message, "\n");
			print(NMEA2000Counts[keys[k]], "\t\t", payload[7], "\t\t", keys[k], "\t", description, "\n");
			//			printBlue(payload, "\n");
			}
		if (NMEA2000Decode) {
			if (decodeOK) print(JSON.stringify(decoded, null, "\t"), "\n");
			//			else print(" - decoding not available\n");
			}
		}
	}

function receive126996(payload){
	if (trace) printOrange("In receive126996\n");
	payloads.push(payload);
	}

function list126996(){
	if (trace) printOrange("In list126996\n");
	if (payloads.length> 0){
		//sort on src (byte 7)
		payloads.sort(function sortOrder(a, b){
				if (a[7] > b[7]) return 1;
				if (a[7] < b[7]) return -1;
				return 0;
				});
		printUnderlined("\n\nNMEA2000 stations responding to PGN126996 request\n");
		printBlue(padEnd("Source",6), " ", padEnd("ProdCode",10), " ", padEnd("ModelId",26), " ", padEnd("SoftwareVersionCode",20), " ", padEnd("ModelSerialCode",16), " ", padEnd("Certification",14), " ", "LoadEquivalency", "\n");
		n2k = new NMEA2000(126996);
		for (i = 0; i < payloads.length; i++){
			try {
				n2k.decode(payloads[i]);
				print(padEnd(n2k.origin,6), " ", padEnd(n2k.productCode,10), " ", padEnd(n2k.modelId, 26), " ", padEnd(n2k.softwareVersionCode,20), " ", padEnd(n2k.modelSerialCode, 16), " ", padEnd(n2k.certificationLevel.name,14), " ", n2k.loadEquivalency, "\n");
				}
			catch(message){
				print("Failed to decode PGN", 126996, "\t", message, "\n");
				}
			}
		}
	else print("\nNo NMEA2000 126996 responses\n");
	}

function padEnd(text, upto){	// pad with trailing spaces
	text += "                               ";
	return text.slice(0, upto);
	}
