import express from 'express';
import process from 'process';
import { Quad, Writer, DataFactory, NamedNode, Parser, StreamParser } from 'n3';

const { quad, namedNode, literal, blankNode } = DataFactory;
const app = express();

const port: number = parseInt(process.argv[2]);

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const LDP = 'http://www.w3.org/ns/ldp#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const LH = 'http://localhost:8000/';
const SOSA = 'http://www.w3.org/ns/sosa/';
const SSN = 'http://www.w3.org/ns/ssn/';
const SC = 'https://solid.ti.rw.fau.de/public/ns/stream-containers#';

const MEMBERSHIP_RESOURCE = namedNode('#window1');
const HAS_MEMBER_RELATION = namedNode('inWindow');
const CONTENT_TIMESTAMP_RELATION = namedNode(SOSA + 'resultTime');
const LOGICAL_WINDOW = literal('PT2M', namedNode(XSD + 'duration'));

const map: Map<string, Quad[]> = new Map();
let ToS : string;

var router = express.Router();
router.route('/').get(function (req, res, next) {
	res.setHeader('Content-Type', 'text/turtle');
	res.status(200);
	let writer: Writer<Quad> = new Writer(res);
	let window = blankNode();
	let nextNode : NamedNode;
	if (ToS === undefined) {
		nextNode = namedNode(LDP+'nil');
	} else {
		nextNode = namedNode(ToS);
	}
	writer.addQuads([
		quad(namedNode(''), namedNode(RDF + 'type'), namedNode(SC + 'StackContainer')),
		quad(namedNode(''), namedNode(SC + 'window'), window),
		//quad(window, namedNode(SC + 'physical'), PHYSICAL_WINDOW),
		quad(window, namedNode(SC + 'logical'), LOGICAL_WINDOW),
		quad(window, namedNode(LDP + 'membershipResource'), MEMBERSHIP_RESOURCE),
		quad(window, namedNode(LDP + 'hasMemberRelation'), HAS_MEMBER_RELATION),
		quad(window, namedNode(SC + 'contentTimestampRelation'), CONTENT_TIMESTAMP_RELATION),
		// add next predicate
		quad(window, namedNode(LDP + 'next'), nextNode),
	]);
	Array.from(map.keys()).forEach((containedResource) => writer.addQuad(namedNode(''), namedNode(LDP + 'contains'), namedNode(containedResource)));
	writer.end();
});
// push a new quad onto the stack
router.route('/push').post(function (req, res, next) {
	try {
		let parser = new StreamParser();
		req.pipe(parser);
		let quads: Quad[] = [];

		parser.on('data', (quad) => quads.push(quad));
		parser.on('end', () => {
			let uri = '/' + map.size;
			map.set(uri, quads);
			// set new element's 'next' to previous ToS
			if(ToS === undefined) {
				quads.push(quad(blankNode(), namedNode(LDP + 'next'), namedNode(LDP + 'nil')));
			} else {
				quads.push(quad(blankNode(), namedNode(LDP + 'next'), namedNode(ToS)));
			}
			// set ToS to new element
			ToS = uri;		
			res.status(201);
			res.send();
		});
	} catch (error) {
		res.status(400);
		res.send();	
	}
});

// pop a quad from the stack
router.route('/pop').post(function (req, res, next) {
	if(ToS === undefined) {
		res.send(namedNode(LDP+'nil'));
	} else {
		// remove top of stack
		let popNode = map.get(ToS);
		if (popNode === undefined){
			res.status(400);
			res.send();
			return;
		}
		// remove quad from map
		map.delete(ToS);

		// set new top of stack
		let newToS = popNode.filter(q => q.predicate.equals(namedNode(LDP + 'next')))[0].object.value;
		ToS = newToS;

		res.status(200);
		res.send(popNode);
	}
});

//peak ToS
router.route('/peak').get(function (req, res, next) {
	res.setHeader('Content-Type', 'text/turtle');
	res.status(200);
	if(ToS === undefined) {
		res.send(namedNode(LDP+'nil'));
	} else {
		res.send(map.get(ToS));
	}
});

router.route('/*').get(function (req, res, next) {
	res.setHeader('Content-Type', 'text/turtle');
	res.status(200);
	let writer: Writer<Quad> = new Writer(res);
	writer.addQuads(map.get(req.path) ?? []);
	writer.end();
});
app.use(router);
app.listen(port, () => {
	console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});