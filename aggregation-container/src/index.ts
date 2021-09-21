import express from 'express';
import process from 'process';
import { Quad, Writer, DataFactory, NamedNode, Parser, StreamParser } from 'n3';
import moment from 'moment';
import { resolveSoa } from 'dns';

const { quad, namedNode, literal, blankNode } = DataFactory;
const app = express();

const port: number = parseInt(process.argv[2]);

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const LDP = 'http://www.w3.org/ns/ldp#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const LH = 'http://localhost:8000/';
const SOSA = 'http://www.w3.org/ns/sosa/';
const SSN = 'http://www.w3.org/ns/ssn/';
const AC = 'https://solid.ti.rw.fau.de/public/ns/stream-containers#';

const SUM_URI = 'https://www.w3.org/2005/xpath-functions/#sum';
const SUM_FUNCTION: (as: number[]) => number = (as) => as.length > 0 ? as.reduce((a, b) => a + b, 0) : NaN;
const AVG_URI = 'https://www.w3.org/2005/xpath-functions/#avg';
const AVG_FUNCTION: (as: number[]) => number = (as) => as.reduce((a, b) => a + b, 0) / as.length;
const MIN_URI = 'https://www.w3.org/2005/xpath-functions/#min';
const MIN_FUNCTION: (as: number[]) => number = (as) => Math.min(...as);
const MAX_URI = 'https://www.w3.org/2005/xpath-functions/#max';
const MAX_FUNCTION: (as: number[]) => number = (as) => Math.max(...as);
const COUNT_URI = 'https://www.w3.org/2005/xpath-functions/#count';
const COUNT_FUNCTION: (as: number[]) => number = (as) => as.length;
const SAMPLE_URI = 'https://www.w3.org/2005/xpath-functions/#sample';
const SAMPLE_FUNCTION: (as: number[]) => number = (as) => as.length > 0 ? as.sort((a,b) => Math.random() - 0.5)[0] : NaN;

const AGG_MAP = new Map<string,(as: number[]) => number>();
AGG_MAP.set(SUM_URI, SUM_FUNCTION);
AGG_MAP.set(AVG_URI, AVG_FUNCTION);
AGG_MAP.set(MIN_URI, MIN_FUNCTION);
AGG_MAP.set(MAX_URI, MAX_FUNCTION);
AGG_MAP.set(COUNT_URI, COUNT_FUNCTION);
AGG_MAP.set(SAMPLE_URI, SAMPLE_FUNCTION);

const MEMBERSHIP_RESOURCE = namedNode('#waischenfeld');
const HAS_MEMBER_RELATION = namedNode('#numTemperature');
const INSERTED_AGGREGATION_RELATION = namedNode(SOSA + 'hasSimpleResult');
const AGGREGATION_FUNCTION = namedNode(SAMPLE_URI);

const map: Map<string, Quad[]> = new Map();

var router = express.Router();
router.route('/').get(function (req, res, next) {
	res.setHeader('Content-Type', 'text/turtle');
	res.status(200);
	let writer: Writer<Quad> = new Writer(res);
	writer.addQuads([
		quad(namedNode(''), namedNode(RDF + 'type'), namedNode(AC + 'AggregationContainer')),
		quad(namedNode(''), namedNode(LDP + 'membershipResource'), MEMBERSHIP_RESOURCE),
		quad(namedNode(''), namedNode(LDP + 'hasMemberRelation'), HAS_MEMBER_RELATION),
		quad(namedNode(''), namedNode(AC + 'insertedAggregationRelation'), INSERTED_AGGREGATION_RELATION),
		quad(namedNode(''), namedNode(AC + 'aggregationFunction'), namedNode(SUM_URI)),
	]);
	Array.from(map.keys()).forEach((containedResource) => writer.addQuad(namedNode(''), namedNode(LDP + 'contains'), namedNode(containedResource)));
	let results = Array.from(map.entries()).map(([resourceName, resourceQuads]) =>
		resourceQuads.filter((quad) =>
			quad.predicate.equals(INSERTED_AGGREGATION_RELATION)
		).map((quad) =>
			parseFloat(quad.object.value)
		)[0]
	);
	let aggFunc = AGG_MAP.get(AGGREGATION_FUNCTION.value);
	console.log(aggFunc!(results));
	writer.addQuad(quad(MEMBERSHIP_RESOURCE, HAS_MEMBER_RELATION, literal(aggFunc!(results))));
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