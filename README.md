# FG-assignment

Test me with `docker compose up -d`
Please use graceful shutdown like `docker compose down`, otherwise, service will not unregister itself from active state succesfully.

# Analysis 
The game is grouping 10 (configurable) players together in real time manner (grouping time is 30 seconds). Player contains information about the country/location, so the players are distributed all over locations and might be globally everywhere.
As this is a real time game, I think designing a distributed system all over the world to support the game experience is sensible, for example, players in Finland will be served by Finnish backend server. This will improve the latency for the end user, therefore, improve the game experience. 
I play League of Legends, also a game matching of 10 players together into a match based on the player rank. So, I believe that it is sensible that I would assume that the game is quite complex and there would be a game engine for it. I think we can go with one of 2 options
-	HTTP request between server and client, client needs to call the service for update, the server can remain stateless and scale easily without any other complexity. The downside is that the client might do a lot of requests, and with many clients, the server might be bombarded, and the system might do DDoS itself when the system grows.
-	Web socket between server and client. The game running on client device can run and receive the data passively, by the server will push the data to clients through the socket. Server need to be stateful to store the active connection to the client. The good side is that in the game, I think a lot of game events, data needs to be broadcast, and this is quite simple when we have a stateful service which holds the sockets, and the sync between player is also better, as the events of the game will be received by the players at the same time, instead of depends on the client code. The downside of this one that it introduces the complexity of the distributed system, where the deciding the server that the player would connect to and how to handle when the backend service fail is more complicated.
I think the first approach is straightforward and quite easy, where the player experience might become an issue when the game evolves. And to show case my experience, I would go for the second option, which I believe I could provide better player experience (as I am a gamer too).

The infrastructure and the backend service of the system should be configurable and self-organized. I have some knowledge how Kafka brokers do their self-organized method. Anyway, I would not choose the leader-follower pattern, but they are all leader, and they can promote each other to serve the clients.

The server should be configurable like where an instance can have id and(or) name, and an address that the client could connect to, such as “fi01.futureplaygame.com”, where it can be discovered by the client.
Multiple instances can be instanced by the game code, but different configurations, I would take example in my code with

- “fi.futureplaygame.com”,
- “se.futureplaygame.com” 

(Where the Finnish server is better than Sweden server, probably as Finnish players are happiest players in the world 😊)

The scaling within 1 region/country could also be done, but I will not going to detail on that as it is just configuration matter.
The game I also assume: the game is full of the players with players from different levels range, therefore, the game is usually crowed and the criteria for match making usually can find enough players, BUT of course there might be when the late  night time, where there are not many active players, so I would only implement a simple algorithm to handle this case and merging the players when needed.

## Score Matching:
A formal language how to determine the matching scores of the player is also  introduce for flexibility. For example, I will describe a formula that calculate the matching scores with “level / 10”, which means that with the player level, the computation of the score will be player.level /10, and might be rounded. So player level 9 and 11 would end up  the same score, which is 1. This value would help determine to group up players group that have the score closely together.

The game logic should also be described by a formal language, for simplicity, I set the base game is that each user will give an input, and then a function defined could be described, for example:
Guess the number: each player guesses 1 number in range 1-100, and then the system will generate a random number, whoever has closest value would win, so the competition description is “RANDOM”
Maximum of points: The client will observe some score extracts from the game, and the server will decide whoever has the best grade will win, and competition descriptions is “MAX”
So, in general, there would be a formal way to describe the game by the game creator, and I will only implement RANDOM and MAX game strategy.

# API
- For administrators to create the game: 
POST /api/v1/game to create the game,

example payload: 
{“name":"Guess number","max_player":10,"match_formula":"{\"match\":\"`${country}-pool`\",\"score\":\"level / 10\"}

GET /api/v1/game to get all the games,
- For conneting to the game

POST /api/v1/hint to ask the server for the personal token to join the game, and which server that the client should connect to

Example payload: { "id": "1", "gameId": "1" }
Example response: 
{ "token": "eyJ1c2VyX2lkIjoxLCJ1c2VyX25hbWUiOiJBaW5vIiwidXNlcl9sZXZlbCI6NiwidXNlcl9jb3VudHJ5IjoiRkkiLCJtYXRjaF9zY29yZSI6MSwiZ2FtZV9pZCI6IjEifQ==", "service": "localhost:3001/ws" }

Websocket endpoint /ws to serve players during the game.

In the design, I have advertised the connect server for the player, firstly near their location, and then using a match function, to group all of the player having a same name, for example, people located in finland was grouped into the pool called “FI-pool”.
The number of player is configurable through the game administration, by updating/creating the game with max_player selected.
The game could also be scheduled, so the player would wait at most 30 seconds to get into the game, and if the queue is big, there is no need to wait for whole 30 seconds, but the games will be scheduled after it meets the threshold in queue.
I think that the requirement does not require me to implement the simple game to simulate how the game run, but as I never have experienced with WebSocket before as I said in my interview, I think learning it would be great as well, through this opportunity.

# Code structure:
The implementation of server is in folder /backend, I have also implemented a simulator under folder /simulator for client code that would use the WebSocket to connects to backend services, you can see the output of the game events through the logs of the containers.

I think my organization styles is affected by my experience in coding GO, so that the packages are separated and clear in responsibilities.
The implementation is heavily focused on functional programming, as I see the ease of organizing code. I believe that for some people, it is really difficult to read and follow at first, but after a while, I think I see the art in functional code, as I see clean organization, and very easy to test.
The choice of language is JavaScript with NodeJS. I thought that it would be faster to code in JavaScript as generic. I do not really have problems coding with generic-typed language, and I think it is much faster for me not to specify tons of interfaces.
The services are containerized and configurable to be deployed in distributed locations. The way to test it locally is to use “docker compose up”
Obviously, I spend more than 4 hours to complete this, but as I said, I want to learn about the WebSocket and see the meaning of the assignment, to test out my idea how I would implement the game that I have been playing for a decade.