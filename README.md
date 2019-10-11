Pinata Demo 1
=============

A browser-based game demonstrating Pinata integration. All state is stored on
the server, making cheating practically impossible.


Building and running the back end
---------------------------------

Do the following from the `back` directory.

Install dependencies

```
    npm install
```

Set the relevant environment variables

```
    source ./environment/env_dev.sh
```

Compile and run the app

```
    npm run build
    node ./dist/index.js
```

It will then be available at http://localhost:3001.


Building and running the front-end
----------------------------------

Do the following from the `front` directory.

Install dependencies

```
    npm install
```

Set the relevant environment variables

```
    source ./environment/env_dev.sh
```

Compile and run the app

```
    npm run start
```

It will then be available at http://localhost:8080.


Latency simulation
------------------

To simulate a connection with a 100ms RTT, run

```
    tc qdisc add dev lo root handle 1:0 netem delay 50msec
```

And to restore it to normal

```
    tc qdisc del dev lo root
```
