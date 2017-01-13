function SirpentHex2DGame(game_id, canvas_id) {
  this.canvas = document.getElementById(canvas_id)
  this.context = this.canvas.getContext("2d")

  this.width = this.canvas.width
  this.height = this.canvas.height

  // Assemble a Websocket URL from a relative path on this server.
  // http://stackoverflow.com/a/20161536
  var websocket_url_from_relative = function(s) {
    var l = window.location
    return ((l.protocol === "https:") ? "wss://" : "ws://") + l.host + s
  }

  var grid = false
  var latest_player_states = null
  var ws = new WebSocket(websocket_url_from_relative("/worlds/live.json"))
  ws.onmessage = function(e) {
    var game_state = JSON.parse(event.data)

    if (!grid) {
      grid = game_state
      this.hexagon_rings = grid.rings
      this.hexagons_across = this.hexagon_rings * 2 + 1
      this.radius = Math.min(
        this.width / (this.hexagons_across * 1.5 + 0.5),
        this.height / (this.hexagons_across * Math.sqrt(3))
      ) - 0.1
      this.clear()
      this.drawHexagons()
      return
    }

    this.clear()
    this.drawHexagons()
    latest_player_states = game_state.plays
    for (player_id in game_state.plays) {
      var player_state = game_state.plays[player_id]
      this.drawPlayerState(player_state)
    }
    this.drawHexagon(game_state.food, "rgb(200, 0, 0)", "rgb(120, 0, 0)")
  }.bind(this)
  ws.onclose = function(e) {
    for (player_id in latest_player_states) {
      console.log(latest_player_states[player_id].snake.length)
    }
    setTimeout(function() {
      //window.location.reload()
      new SirpentHex2DGame(game_id, canvas_id)
    }, 2500)
  }
  //ws.send(data)
}

SirpentHex2DGame.prototype.drawHexagons = function () {
  var cube = {"x": 0, "y": 0, "z": 0}

  for (cube.x = -this.hexagon_rings; cube.x <= this.hexagon_rings; cube.x++) {
    for (cube.y = -this.hexagon_rings; cube.y <= this.hexagon_rings; cube.y++) {
      for (cube.z = -this.hexagon_rings; cube.z <= this.hexagon_rings; cube.z++) {
        if (cube.x + cube.y + cube.z != 0) {
          continue
        }
        this.drawHexagon(cube, "rgb(150,150,150)", null)
      }
    }
  }
}

SirpentHex2DGame.prototype.outlineHexagon = function (x, y) {
  this.context.beginPath()

  var i
  for (i = 0; i < 6; i++) {
    var hc = this.hexCorner({"x": x, "y": y}, this.radius, i)
    if (i == 0) {
      this.context.moveTo(hc.x, hc.y)
    } else {
      this.context.lineTo(hc.x, hc.y)
    }
  }
}

// hex corner, http://www.redblobgames.com/grids/hexagons/#coordinates
SirpentHex2DGame.prototype.hexCorner = function (center, radius, i) {
  var angle_deg = 60 * i
  var angle_rad = Math.PI / 180 * angle_deg
  var x = center.x + radius * Math.cos(angle_rad)
  var y = center.y + radius * Math.sin(angle_rad)
  return {"x": x, "y": y}
}

SirpentHex2DGame.prototype.drawHexagon = function (hex_vector, strokeColor, fillColor) {
  var canvas_x = this.width / 2 + this.radius * 1.5 * hex_vector.z
  var canvas_y = this.height / 2 + this.radius * Math.sqrt(3) * (hex_vector.x + hex_vector.z/2)

  this.outlineHexagon(canvas_x, canvas_y)

  var tmp

  if (fillColor) {
    tmp = this.context.fillStyle
    this.context.fillStyle = fillColor
    this.context.fill()
    this.context.fillStyle = tmp
  }

  this.context.closePath()

  if (strokeColor) {
    tmp = this.context.strokeStyle
    this.context.strokeStyle = strokeColor
    this.context.stroke()
    this.context.strokeStyle = tmp
  }
}

SirpentHex2DGame.prototype.writeOnHexagon = function (hex_vector, fillColor, text) {
  var canvas_x = this.width / 2 + this.radius * 1.5 * hex_vector.z
  var canvas_y = this.height / 2 + this.radius * Math.sqrt(3) * (hex_vector.x + hex_vector.z/2)

  this.context.textBaseline = "middle"
  this.context.textAlign = "center"
  this.context.fillStyle = fillColor
  this.context.font = "bold 13px Helvetica"
  this.context.fillText(text, canvas_x, canvas_y)
}

SirpentHex2DGame.prototype.drawPlayerState = function (player_state) {
  var i,
      snake = player_state["snake"],
      r = (player_state["alive"]) ? 0 : 255
  for (i = 0; i < snake.length; i++) {
    var segment = snake[i]
    var color = (i == 0) ? "rgb(" + r + ", 120, 0)" : "rgb(" + r + ", 200, 0)"
    this.drawHexagon(segment, "rgb(" + r + ", 120, 0)", color)
    this.writeOnHexagon(segment, "rgb(255, 255, 255)", i)
  }
}

SirpentHex2DGame.prototype.clear = function () {
  this.context.clearRect(0, 0, this.width, this.height)
}
