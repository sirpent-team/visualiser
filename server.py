# https://github.com/crossbario/autobahn-python/blob/master/examples/twisted/websocket/broadcast/server.py

from __future__ import print_function
import sys

from twisted.internet import reactor
from twisted.python import log
from twisted.web.server import Site
from twisted.web.static import File

from twisted.internet import task
from twisted.internet.defer import Deferred
from twisted.internet.protocol import ClientFactory
from twisted.protocols.basic import LineReceiver

from autobahn.twisted.websocket import WebSocketServerFactory, \
    WebSocketServerProtocol, \
    listenWS

import json

class BroadcastServerProtocol(WebSocketServerProtocol):
    def onOpen(self):
        self.factory.register(self)

    def onMessage(self, payload, isBinary):
        # if not isBinary:
        #     msg = "{} from {}".format(payload.decode('utf8'), self.peer)
        #     self.factory.broadcast(msg)
        return

    def connectionLost(self, reason):
        WebSocketServerProtocol.connectionLost(self, reason)
        self.factory.unregister(self)


class BroadcastServerFactory(WebSocketServerFactory):

    """
    Simple broadcast server broadcasting any message it receives to all
    currently connected clients.
    """

    def __init__(self, url):
        WebSocketServerFactory.__init__(self, url)
        self.clients = []
        self.tickcount = 0
        self.tick()

    def tick(self):
        self.tickcount += 1
        self.broadcast("tick %d from server" % self.tickcount)
        reactor.callLater(1, self.tick)

    def register(self, client):
        if client not in self.clients:
            print("registered client {}".format(client.peer))
            self.clients.append(client)

    def unregister(self, client):
        if client in self.clients:
            print("unregistered client {}".format(client.peer))
            self.clients.remove(client)

    def broadcast(self, msg):
        print("broadcasting message '{}' ..".format(msg))
        for c in self.clients:
            c.sendMessage(msg.encode('utf8'))
            print("message sent to {}".format(c.peer))


class EchoClient(LineReceiver):
    delimiter = "\n"

    def connectionMade(self):
        print("connectionMade")
        self.state = "new"
        # self.sendLine("Hello, world!")
        # self.sendLine("What a fine day it is.")
        # self.sendLine(self.end)

    def lineReceived(self, line):
        print("lineReceived", line, self.state)
        msg = json.loads(line)

        if self.state == "new":
            assert(msg["msg"] == "version")
            register_msg = {"msg":"register","data":{"desired_name":"visualiser","kind":"spectator"}}
            self.sendLine(json.dumps(register_msg))
            self.state = "registering"
        elif self.state == "registering":
            assert(msg["msg"] == "weclome")
            self.name = msg["data"]["name"]
            self.grid = msg["data"]["grid"]
            self.state = "ready_for_game"
        elif self.state == "ready_for_game":
            assert(msg["msg"] == "new_game")
            self.game = msg["data"]["game"]
            self.state = "ready_for_turn"
        elif self.state == "ready_for_turn":
            if msg["msg"] == "new_turn":
                self.turn = msg["data"]["turn"]
            elif msg["msg"] == "game_over":
                self.state = "ready_for_game"
            else:
                print("unmatched", self.state, msg)
        else:
            print("unmatched", self.state, msg)

class EchoClientFactory(ClientFactory):
    protocol = EchoClient

    def __init__(self):
        self.done = Deferred()

    def clientConnectionFailed(self, connector, reason):
        print('connection failed:', reason.getErrorMessage())
        self.done.errback(reason)


    def clientConnectionLost(self, connector, reason):
        print('connection lost:', reason.getErrorMessage())
        self.done.callback(None)


if __name__ == '__main__':

    log.startLogging(sys.stdout)

    sirpent_client_factory = EchoClientFactory()
    reactor.connectTCP('localhost', 8080, sirpent_client_factory)

    factory = BroadcastServerFactory(u"ws://127.0.0.1:9000")
    factory.protocol = BroadcastServerProtocol
    listenWS(factory)

    webdir = File(".")
    web = Site(webdir)
    reactor.listenTCP(8081, web)

    reactor.run()
