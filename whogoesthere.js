listen = 10;	// seconds to listen for
var NMEA2000Decode = false;
scriptName = "WhoGoesThere";
consoleName(scriptName);

scriptVersion = 0.1;
checkForUpdates();

var payloads = [];

var descriptors;
var NMEA2000handles = [];		// the NMEA2000 connection handles, if any
listConnections();
if (NMEA2000handles.length > 1) throw("More than one NMEA2000 connection - not supported");
if (NMEA2000handles.length == 1) haveNMEA2000 = true;
else haveNMEA2000 = false;
NMEA2000buffer = {};
NMEA2000Counts = {};
if (haveNMEA2000){
	NMEA2000 = require("NMEA2000");
	//setup listening to responses to PGN59904
	pgnToSend = 59904;
	nmeaSend = new NMEA2000(pgnToSend);
	pgnToReceive = 126996;
	nmeaSend.pgn = pgnToReceive;	// pgn to request
	OCPNonAllNMEA2000(receive126996, pgnToReceive);	// listen out
	nmeaSend.push();

	// listen for all NMA2000 and count
	descriptors = require("pgnDescriptors")();
	for (d = 0; d < descriptors.length; d++){
		pgn = descriptors[d].PGN;
		OCPNonAllNMEA2000(gotNMEA2000, pgn);
		}
	}
else print("No NMEA2000 connection\n");

responses = 0;
payloads = [];	

print("\nListening for ", listen, " seconds");
OCPNonAllNMEA0183(logNMEA0183);
onAllSeconds(tick, 1);
onSeconds(report, listen);

function report(){
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
	scriptResult("End of report");
	}

function gotNMEA2000(payload){
	pgn = getBytes(payload, 3, 3);	// extract the pgn
	NMEA2000buffer[pgn] = payload;
	if (typeof NMEA2000Counts[pgn] == "undefined") NMEA2000Counts[pgn] = 1;
	else NMEA2000Counts[pgn]++;
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
//		print(JSON.stringify(attributes, null, "\t"), "\n");
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
	printBlue("Counts\tSource\tPGN\n");
	const keys = Object.keys(NMEA2000buffer);
	if (keys.length < 1){
		print("(None)\n");
		return;
		}
	for (var k = 0; k < keys.length; k++){
		var decodeOK;
		decoder = new NMEA2000(keys[k]*1);
		payload = NMEA2000buffer[keys[k]];
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
			print(NMEA2000Counts[keys[k]], "\t\t", payload[7], "\t\t", keys[k], "\t", description);
//			printBlue(payload, "\n");
			}
		if (NMEA2000Decode) {
			if (decodeOK) print(JSON.stringify(decoded, null, "\t"), "\n");
			else print(" - decoding not available\n");
			}
		}
	}

function receive126996(payload){
	payloads.push(payload);
	}

function list126996(){
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
			n2k.decode(payloads[i]);
			print(padEnd(n2k.origin,6), " ", padEnd(n2k.productCode,10), " ", padEnd(n2k.modelId, 26), " ", padEnd(n2k.softwareVersionCode,20), " ", padEnd(n2k.modelSerialCode, 16), " ", padEnd(n2k.certificationLevel,14), " ", n2k.loadEquivalency, "\n");
			}
		}
	else print("\nNo NMEA2000 126996( responses\n");
	}

function padEnd(text, upto){	// pad with trailing spaces
	text += "                               ";
	return text.slice(0, upto);
	}

function checkForUpdates(){
	if (!OCPNisOnline()) return;
	choice = messageBox("Are you truely on-line to the internet?", "YesNo", "checkVersion");
	if (choice == 3) return;
	check = require("https://raw.githubusercontent.com/antipole2/JavaScript_pi/master/onlineIncludes/checkForUpdates.js");
	check(scriptVersion, days = 5,
		"https://raw.githubusercontent.com/antipole2/WhoGesThere/main/whogesthere.js",	// url of script
		"https://raw.githubusercontent.com/antipole2/WhoGesThere/main/whogesthere.JSON"// url of version JSON
		);
	}
