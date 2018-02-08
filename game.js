var Phaser = window.Phaser;
var WINDOW_WIDTH = window.innerWidth;
var WINDOW_HEIGHT = window.innerHeight;

var game = new Phaser.Game({
  width: WINDOW_WIDTH * 2,
  height: WINDOW_HEIGHT * 2,
  renderer: Phaser.AUTO,
  antialias: true,
  state: {
    preload,
    create,
    update,
    render
  }
});

// gameScene group
var gameScene;
var player;
var bulvars;
var squares;
var powerItems;
var pauseItems;
var timeText;

// startScene group
var startScene;
var startButton;
var startText;

// endScene group
var endScene;
var restartButton;
var endText;

// timer
var itemTimer;
var scoreTimer;

// collision group
var squareCollisionGroup,
  bulvarCollisionGroup,
  itemCollisionGroup;

// 方向控制
var cursors;
var pointer;
var fireButton;

// 方块变量
var squareWidth = 120;
var squareSpeed = 25;
var squareDeltaTime = 1500;
var bulvarSpeed = 1200;

// 子弹变量
var bulvarTime = 0;
var bulvarDelta = 300;

var button;

// 取色池
var colorPool = ['#80ee33', '#e41556', '#25c3eb', '#e76d29'];

function preload() {
  game.load.image('player', './images/player.png');
}

function create() {

  // game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
  game.input.scale.x = this.game.width / window.innerWidth;
  game.input.scale.y = this.game.height / window.innerHeight;

  game.stage.backgroundColor = '#1d2334';

  // 启动物理引擎
  game.physics.startSystem(Phaser.Physics.P2JS);
  game.physics.p2.restitution = 1;
  game.physics.p2.friction = 0;
  game.physics.p2.gravity.x = 0;
  game.physics.p2.gravity.y = 0;
  // 边框碰撞 Group 是否开启
  game.physics.p2.updateBoundsCollisionGroup(false);

  // 创建两个碰撞组，组内成员默认不会互相碰，除非调用 collides 方法传入自己组
  squareCollisionGroup = game.physics.p2.createCollisionGroup();
  bulvarCollisionGroup = game.physics.p2.createCollisionGroup();
  itemCollisionGroup = game.physics.p2.createCollisionGroup();

  gameScene = game.add.group(game.world, 'gameScene');

  // 时间文本
  timeText = game.add.text(game.world.centerX, 100, '00:00', { fill: '#fff', fontWeight: 'normal', fontSize: '64px' }, gameScene);
  timeText.anchor.set(0.5, 0.5);

  // player
  player = game.add.sprite(game.world.centerX, game.world.centerY, 'player', 0, gameScene);
  game.physics.enable(player, Phaser.Physics.P2JS);
  player.body.setCircle(38);
  player.body.setCollisionGroup(bulvarCollisionGroup);
  player.body.collides(squareCollisionGroup);

  // player碰到方块
  player.body.onBeginContact.add(playerHitSquare, this);

  // 子弹
  createBulvars(32);

  // 道具
  powerItems = game.add.group(gameScene, 'powerItems');
  pauseItems = game.add.group(gameScene, 'pauseItems');

  // 方块们
  squares = game.add.group(gameScene, 'squares');
  gameScene.bringToTop(squares);

  // 按钮与触摸事件
  cursors = game.input.keyboard.createCursorKeys();
  fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

  game.input.maxPointers = 1;
  game.input.addMoveCallback(function(the_pointer, x, y, boolean) {

    var vec = {
      x: x - player.x,
      y: y - player.y
    };

    player.body.rotation = Math.atan2(vec.y, vec.x) - Math.PI / 2;
  }, this);

  // 定时创建 Items
  itemTimer = new Phaser.Timer(game, false);
  itemTimer.loop(squareDeltaTime, function() {
    var around_position = random_around_Position(squareWidth / 4);
    var health = randomInt(1, (Math.ceil(itemTimer.ms / 20000) * 10));

    createOneSquare(squareWidth, around_position, health, squareSpeed);
  });

  itemTimer.loop(13000, function() {
    createOnePower();
  });

  itemTimer.loop(19000, function() {
    createOnePause();
  });
  game.time.add(itemTimer);

  // 生存计时
  scoreTimer = new Phaser.Timer(game, false);
  scoreTimer.loop(1000000, function() {
  }, this);
  game.time.add(scoreTimer);

  // 开始场景
  startScene = game.add.group(game.world, 'startScene');
  startButton = game.add.button(game.world.centerX, game.world.centerY, 'player', startBtnOnClick, this);
  startButton.anchor.set(0.5, 0.5);

  startText = game.add.text(game.world.centerX, game.world.centerY + 100, '点我', { fill: '#fff', fontWeight: 'normal', fontSize: '48px', align: 'center' }, startScene);
  startText.anchor.set(0.5, 0.5);

  startScene.add(startButton);

  // 结束场景
  endScene = game.add.group(game.world, 'endScene');
  restartButton = game.add.button(game.world.centerX, game.world.centerY, 'player', restartBtnOnClick, this);
  restartButton.anchor.set(0.5, 0.5);
  endScene.add(restartButton);

  endText = game.add.text(game.world.centerX, 200, ' ', { fill: '#fff', fontWeight: 'normal', fontSize: '48px', align: 'center' }, endScene);
  endText.anchor.set(0.5, 0.5);

  startScene.visible = true;
  gameScene.visible = false;
  endScene.visible = false;
}

function update() {
  if (cursors.left.isDown) {
    player.body.angularVelocity = -10;
  } else if (cursors.right.isDown) {
    player.body.angularVelocity = 10;
  } else {
    player.body.angularVelocity = 0;
  }

  // 非自动 fire
  // if (fireButton.isDown) {
  // fireBulvar(player.body.rotation - Math.PI / 2, bulvarSpeed, 100);
  // }
  fireBulvar(player.body.rotation + Math.PI / 2, bulvarSpeed, bulvarDelta);

  countTime();
}

function render() {

}

function createBulvars(r) {
  // bulvar texture
  var bitmap = game.add.bitmapData(r, r);

  bitmap.ctx.beginPath();
  bitmap.ctx.arc(r / 2, r / 2, r / 2, 0, 2 * Math.PI);
  bitmap.ctx.fillStyle = '#fcdc00';
  bitmap.ctx.fill();

  // bulvar group
  bulvars = game.add.group(gameScene, 'bulvars');
  // 为之后加入group的sprite添加物理，对现有的不影响，所以顺序很重要
  bulvars.enableBody = true;
  bulvars.physicsBodyType = Phaser.Physics.P2JS;
  bulvars.createMultiple(50, bitmap);

  // 设置 bulvar 属性
  bulvars.forEach(function(child) {
    // 自身不碰撞，与方块碰撞
    child.body.setCollisionGroup(bulvarCollisionGroup);
    child.body.collides([squareCollisionGroup, itemCollisionGroup]);

    // 速度不减
    child.body.fixedRotation = true;
    child.body.setZeroDamping();
    child.body.mass = 0.1;

    // 继承自 Phaser.Component.InWorld 的属性, 子弹出边界后 kill, 实现无限子弹，
    // sprite 的 kill 方法，是循环使用，不释放内存，destroy 是彻底消灭
    child.outOfBoundsKill = true;
    child.checkWorldBounds = true;

    child.body.onBeginContact.add(bulvarHitItems, child);

  }, this, false);
}

function fireBulvar (angle, speed, delta) {
  // To avoid them being allowed to fire too fast we set a time limit
  if (game.time.now > bulvarTime) {
    // Grab the first bulvar we can from the pool
    var bulvar = bulvars.getFirstExists(false);

    if (bulvar) {
      // And fire it
      bulvar.reset(player.x, player.y);
      bulvar.body.velocity.y = Math.sin(angle) * speed;
      bulvar.body.velocity.x = Math.cos(angle) * speed;
      bulvarTime = game.time.now + delta;
    }
  }

}

function createOneSquare(width, position, health, speed) {
  var color = randomColor();

  var bitmap = game.add.bitmapData(width, width);

  bitmap.ctx.beginPath();
  bitmap.ctx.lineWidth = 12;
  bitmap.ctx.strokeStyle = color;
  bitmap.ctx.strokeRect(0, 0, width, width);

  var square = squares.create(position.x, position.y, bitmap);

  game.physics.enable(square, Phaser.Physics.P2JS);

  var square_text = game.add.text(0, 0, health, { fill: color, fontWeight: 'normal', fontSize: '48px' });

  square.addChild(square_text);

  square_text.anchor.setTo(0.5, 0.5);

  square.health = health;
  square.body.fixedRotation = true;
  square.body.setZeroDamping();
  square.body.mass = 999999999;

  square.body.setCollisionGroup(squareCollisionGroup);
  square.body.collides([bulvarCollisionGroup, squareCollisionGroup]);

  square.body.onBeginContact.add(squareHitEachOther, square);

  // 方块向 player 移动
  var dx = player.position.x - square.position.x;
  var dy = player.position.y - square.position.y;
  var dvec = new Phaser.Point(dx, dy);

  dvec.setMagnitude(speed);
  square.body.velocity.x = dvec.x;
  square.body.velocity.y = dvec.y;

  square.my_xspeed = dvec.x;
  square.my_yspeed = dvec.y;
}

function createOnePower() {

  var bitmap = game.add.bitmapData(100, 100);

  // 画圈圈
  bitmap.ctx.beginPath();
  bitmap.ctx.lineWidth = 4;
  bitmap.ctx.fillStyle = '#0a7787';
  bitmap.ctx.strokeStyle = '#ffffff';
  bitmap.ctx.arc(50, 50, 48, 0, Math.PI * 2, true);
  bitmap.ctx.fill();
  bitmap.ctx.stroke();
  // 画 'LV' 文字
  bitmap.ctx.fillStyle = '#ffffff';
  bitmap.ctx.font = '32px Arial';
  bitmap.ctx.fillText('Lv', 16, 50);
  // 画箭头
  bitmap.ctx.beginPath();
  bitmap.ctx.moveTo(68, 20);
  bitmap.ctx.lineTo(84, 35);
  bitmap.ctx.lineTo(76, 35);
  bitmap.ctx.lineTo(76, 50);
  bitmap.ctx.lineTo(60, 50);
  bitmap.ctx.lineTo(60, 35);
  bitmap.ctx.lineTo(52, 35);
  bitmap.ctx.fill();

  var randomDeg = randomInt(0, 360);
  var r = 250;
  var health = Math.floor(game.time.now / 1000 / 30) + 10;

  var position = {
    x: game.world.centerX + r * Math.cos(randomDeg),
    y: game.world.centerY + r * Math.sin(randomDeg)
  };

  if (powerItems.children.length > 0) {
    powerItems.children[0].destroy();
  }

  var item = powerItems.create(position.x, position.y, bitmap);

  game.physics.enable(item, Phaser.Physics.P2JS);

  var item_text = game.add.text(0, 0, health, { fill: '#fff', fontWeight: 'normal', fontSize: '32px' });

  item.addChild(item_text);

  item_text.anchor.setTo(0.5, 0.5);
  item_text.y = 24;

  item.health = health;
  item.body.kinematic = true;
  item.body.setCircle(48);
  item.body.setCollisionGroup(itemCollisionGroup);
  item.body.collides([bulvarCollisionGroup]);

  setTimeout(function() {

  }, 1000);
}

function createOnePause() {
  var bitmap = game.add.bitmapData(100, 100);

  // 画圈圈
  bitmap.ctx.beginPath();
  bitmap.ctx.lineWidth = 4;
  bitmap.ctx.fillStyle = '#aa303c';
  bitmap.ctx.strokeStyle = '#ffffff';
  bitmap.ctx.arc(50, 50, 48, 0, Math.PI * 2, true);
  bitmap.ctx.fill();
  bitmap.ctx.stroke();
  // 画暂停符号
  bitmap.ctx.fillStyle = '#fff';
  bitmap.ctx.fillRect(38, 20, 8, 30);
  bitmap.ctx.fillRect(54, 20, 8, 30);

  var randomDeg = randomInt(0, 360);
  var r = 250;
  var health = Math.floor(game.time.now / 1000 / 30) + 10;

  var position = {
    x: game.world.centerX + r * Math.cos(randomDeg),
    y: game.world.centerY + r * Math.sin(randomDeg)
  };

  if (pauseItems.children.length > 0) {
    pauseItems.children[0].destroy();
  }

  var item = pauseItems.create(position.x, position.y, bitmap);

  game.physics.enable(item, Phaser.Physics.P2JS);

  var item_text = game.add.text(0, 0, health, { fill: '#fff', fontWeight: 'normal', fontSize: '32px' });

  item.addChild(item_text);

  item_text.anchor.setTo(0.5, 0.5);
  item_text.y = 24;

  item.health = health;
  item.body.kinematic = true;
  item.body.setCircle(48);
  item.body.setCollisionGroup(itemCollisionGroup);
  item.body.collides([bulvarCollisionGroup]);
}

function bulvarHitItems(hitted_body, bodyB, shapeA, shapeB, equation) {
  var hitedItem = hitted_body.sprite;

  if (hitedItem.health == 1) {
    if (hitedItem.parent == squares) {
      var emitter = game.add.emitter(0, 0, 50);
      var bitmap = game.add.bitmapData(24, 24);

      bitmap.ctx.beginPath();
      bitmap.ctx.fillStyle = hitedItem.key.context.strokeStyle;
      bitmap.ctx.fillRect(0, 0, 24, 24);

      emitter.makeParticles(bitmap);
      emitter.x = hitedItem.x;
      emitter.y = hitedItem.y;
      emitter.gravity = -20;
      emitter.setScale(0.5, 1, 0.5, 1);
      emitter.setAlpha(1, 0, 1000);
      emitter.minAngle = 0;
      emitter.maxAngle = 360;
      emitter.maxSpeed = 400;

      emitter.start(true, 1000, null, 40);

      hitedItem.destroy();
    }

    if (hitedItem.parent == powerItems) {
      if (bulvarDelta > 30) {
        bulvarDelta -= 30;
      }
      hitedItem.destroy();
    }

    if (hitedItem.parent == pauseItems) {
      itemTimer.pause();

      squares.forEach(function(child) {
        child.body.velocity.x = 0;
        child.body.velocity.y = 0;
      });

      setTimeout(function() {
        itemTimer.resume();

        squares.forEach(function(child) {
          child.body.velocity.x = child.my_xspeed;
          child.body.velocity.y = child.my_yspeed;
        });
      }, 5000);

      hitedItem.destroy();
    }
  } else {
    hitedItem.health -= 1;
    hitedItem.children[0].text -= 1;
  }
}

function playerHitSquare(hitted_body, bodyB, shapeA, shapeB, equation) {
  gameScene.visible = false;
  endScene.visible = true;

  squares.removeAll(true, true, true);
  powerItems.removeAll(true, true, true);
  pauseItems.removeAll(true, true, true);

  player.kill();

  itemTimer.stop(false);
  scoreTimer.stop(false);

  endText.text = '哇哦！\n你坚持了 00:' + timeText.text + '\n 再来一把看看吧！';
}

function squareHitEachOther(hitted_body, bodyB, shapeA, shapeB, equation) {
  if (hitted_body.sprite != null && (hitted_body.sprite.parent == squares)) {
    mergeSquare(hitted_body.sprite, this);
  }
}

function mergeSquare(s1, s2) {
  var new_health = s1.health + s2.health;
  var new_position = {
    x: (s1.x + s2.x) / 2,
    y: (s1.y + s2.y) / 2
  };

  s1.destroy();
  s2.destroy();

  createOneSquare(squareWidth, new_position, new_health, squareSpeed);
}

function countTime() {
  var time = scoreTimer.seconds.toFixed(2);
  var second = (time % 60).toFixed(2);
  var minute = Math.floor(time / 60).toString();

  if (minute.length == 1) {
    minute = '0' + minute;
  }

  if (second.length == 4) {
    second = '0' + second;
  }

  timeText.text = (minute + ':' + second);
}

function initStart() {
  bulvarDelta = 300;

  gameScene.visible = true;
  startScene.visible = false;
  endScene.visible = false;

  player.revive();
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;

  itemTimer.start();
  scoreTimer.start();
}

function startBtnOnClick() {
  initStart();
}

function restartBtnOnClick() {
  initStart();
}

// helper function
function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomColor() {
  return colorPool[randomInt(0, colorPool.length - 1)];
}

function randomBackgroundColor() {
  var color_index = randomInt(0, colorPool.length - 1);
  var color = colorPool[color_index];

  colorPool.splice(color_index, 1);
  return color;
}

function random_around_Position(s_width) {
  var type = randomInt(0, 3);
  var position = { x: 0, y: 0 };

  switch (type) {
  case 0: // top
    position.x = randomInt(-s_width, game.world.width);
    position.y = -s_width;
    break;
  case 1: // bottom
    position.x = randomInt(-s_width, game.world.width);
    position.y = game.world.height + s_width;
    break;
  case 2:
    position.x = -s_width;
    position.y = randomInt(-s_width, game.world.height);
    break;
  case 3:
    position.x = game.world.width + s_width;
    position.y = randomInt(-s_width, game.world.height);
    break;
  default:
    break;
  }

  return position;
}
