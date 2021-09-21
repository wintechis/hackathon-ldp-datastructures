import express from 'express';
import process from 'process';
import { Quad, Writer, DataFactory, NamedNode, Parser, StreamParser } from 'n3';
import moment from 'moment';

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
const PHYSICAL_WINDOW = literal(3);
const LOGICAL_WINDOW = literal('PT2M', namedNode(XSD + 'duration'));

const map: Map<string, Quad[]> = new Map();

var router = express.Router();
router.route('/').get(function (req, res, next) {
	res.setHeader('Content-Type', 'text/turtle');
	res.status(200);
	let writer: Writer<Quad> = new Writer(res);
	let window = blankNode();
	writer.addQuads([
		quad(namedNode(''), namedNode(RDF + 'type'), namedNode(SC + 'StreamContainer')),
		quad(namedNode(''), namedNode(SC + 'window'), window),
		//quad(window, namedNode(SC + 'physical'), PHYSICAL_WINDOW),
		quad(window, namedNode(SC + 'logical'), LOGICAL_WINDOW),
		quad(window, namedNode(LDP + 'membershipResource'), MEMBERSHIP_RESOURCE),
		quad(window, namedNode(LDP + 'hasMemberRelation'), HAS_MEMBER_RELATION),
		quad(window, namedNode(SC + 'contentTimestampRelation'), CONTENT_TIMESTAMP_RELATION),
	]);
	Array.from(map.keys()).forEach((containedResource) => writer.addQuad(namedNode(''), namedNode(LDP + 'contains'), namedNode(containedResource)));
	// Calculate physical window
	/*
	Array.from(map.entries()).sort(([resource1, quadList1], [resource2, quadList2]) => {
		let timestamp1 = new Date(quadList1.filter(q => q.predicate.equals(CONTENT_TIMESTAMP_RELATION))[0].object.value);
		let timestamp2 = new Date(quadList2.filter(q => q.predicate.equals(CONTENT_TIMESTAMP_RELATION))[0].object.value);
		if(timestamp1 === timestamp2) {
			return 0;
		} else if(timestamp1 < timestamp2) {
			return 1;
		} else {
			return -1;
		}
	}).slice(0, parseInt(PHYSICAL_WINDOW.value)).forEach(([memberResource, _]) => writer.addQuad(MEMBERSHIP_RESOURCE, HAS_MEMBER_RELATION, namedNode(memberResource)));
	*/
	// Calculate logical window
	Array.from(map.entries()).forEach(([memberResource, _]) => writer.addQuad(MEMBERSHIP_RESOURCE, HAS_MEMBER_RELATION, namedNode(memberResource)));
	writer.end();
}).post(function (req, res, next) {
	try {
		let parser = new StreamParser();
		req.pipe(parser);
		let quads: Quad[] = [];
		parser.on('data', (quad) => quads.push(quad));
		parser.on('end', () => {
			map.set('/' + map.size, quads);
			res.status(201);
			res.send();
		});
	} catch (error) {
		res.status(400);
		res.send();	
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