# LDP Datastructures Hackathon of the Klausurtagung 20./21.09.2021
Groups:
* Aggregation Container
* Stack Container
* Flatten Container

## Building the Stack Container

To build the stack container, do:

```
$ cd stack-container
$ npm install
$ npm run build
```

Requires ts-node to be installed.

## Using the Stack Container

To run the stack container server, do:

```
$ cd stack-container
$ npm run start 8080
````

To push, peek and pop items on the stack container server with a client, do:

```
$ cd stack-container
$ ./push.sh foo
$ ./peak.sh 
$ ./pop.sh
```

Note: the client scripts assume the server runs on port 8000.

## Acknowledgments

This work was partially funded by the German Federal Ministry of Education and Research through the MOSAIK project (grant no. 01IS18070A).
