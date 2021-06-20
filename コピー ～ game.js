/*

	Kuma Kuma Bang Bang
	2012/06/01

	This program is MIT lisence.

*/

enchant();

var debug = false;

window.onload = function() {

	//実行端末取得
	var userAgent = "PC";
	if( (navigator.userAgent.indexOf('iPhone') > 0 && navigator.userAgent.indexOf('iPad') == -1) || navigator.userAgent.indexOf('iPod') > 0 ){
		userAgent = "iOS";
	}else if( navigator.userAgent.indexOf('Android') > 0){
		userAgent = "Android";
	}else if( navigator.userAgent.indexOf('Chrome') > 0){
		userAgent = "Chrome";
	}else if( navigator.userAgent.indexOf('Firefox') > 0){
		userAgent = "Firefox";
	}

	game = new Game( 320, 320 );
	game.rootScene.backgroundColor = 'rgb(0,0,0)';
	game.fps = 30;
	var sec = function( time ){ return game.fps * time; }
	var rand = function( max ){ return ~~(Math.random() * max); }

	game.preload( 'chara1.gif','map2.gif','icon0.gif','panel.png','panel2.png',
				  'clear.png','mask.png','effect.gif','title.png',
				  'tutorial0_1.png','tutorial0_2.png',
				  'tutorial1_1.png','tutorial1_2.png',
				  'tutorial2_1.png','tutorial2_2.png',
				  'tutorial3_1.png','tutorial3_2.png',
				  'tutorial4_1.png',
				  'tutorial5_1.png');

	game.onload = function (){

		//環境変数
		/////////////////////////////////////////////////////////////////////////////
		var score = 0;
		var size = 60;				//パネルサイズ
		var panelData, itemData;	//ステージ構成用
		var endless = false;		//エンドレスモードフラグ
		var paneladd = false;		//エンドレスモード時パネル追加フラグ

		//タイトル
		/////////////////////////////////////////////////////////////////////////////
		var title = new Scene();
		title.select = 0; //0:nomal 1:endless
		title.board = new Sprite(320,320);
		title.board.image = game.assets['title.png'];
		title.board.x = 0;
		title.board.y = 0;
		title.addChild(title.board);
		title.onenter = function(){
		}
		title.addEventListener('touchend', function(e){
			if( e.x > 94 && e.y > 205 && e.x < 214 && e.y < 227 ){
				endless = false;
				stage.initStage();
				game.popScene();
			}
			if( e.x > 88 && e.y > 236 && e.x < 217 && e.y < 263 ){
				endless = true;
				stage.num = 0;
				life.dec();
				life.dec();
				stage.initStage();
				game.popScene();
			}
		});

		//チュートリアル
		/////////////////////////////////////////////////////////////////////////////
		var tutorial = new Scene();
		tutorial.time = 0;
		tutorial.board = new Sprite(300,300);
		tutorial.page = 1;
		tutorial.maxPage = 1;
		tutorial.addChild(tutorial.board);
		tutorial.onenterframe = function(){
			if( this.time == 0 ){
				this.board.tl.moveTo(10,10,45,enchant.Easing.ELASTIC_EASEOUT);
			}
			this.time++;
		}
		tutorial.onenter = function(){
			this.board.x = 10;
			this.board.y = -320;
			this.time = 0;
			this.page = 1;
			this.maxPage = 1;

			switch(stage.num){
				case 0:
					this.board.image = game.assets['tutorial0_1.png'];
					this.maxPage = 2;
					break;
				case 1:
					this.board.image = game.assets['tutorial1_1.png'];
					this.maxPage = 2;
					break;
				case 2:
					this.board.image = game.assets['tutorial2_1.png'];
					this.maxPage = 2;
					break;
				case 3:
					this.board.image = game.assets['tutorial3_1.png'];
					this.maxPage = 2;
					break;
				case 4:
					this.board.image = game.assets['tutorial4_1.png'];
					this.maxPage = 1;
					break;
				case 5:
					this.board.image = game.assets['tutorial5_1.png'];
					this.maxPage = 1;
					break;
			}
		}
		tutorial.addEventListener('touchend', function(e){
			var endflg = false;
			switch(stage.num){
				case 0:
					if( this.page == 1 )this.board.image = game.assets['tutorial0_2.png'];
					break;
				case 1:
					if( this.page == 1 )this.board.image = game.assets['tutorial1_2.png'];
					break;
				case 2:
					if( this.page == 1 )this.board.image = game.assets['tutorial2_2.png'];
					break;
				case 3:
					if( this.page == 1 )this.board.image = game.assets['tutorial3_2.png'];
					break;
				default:
					endflg = true;
			}
			this.page++;
			if( this.page > this.maxPage )endflg = true;
			if( endflg ){
				this.tl.clear()
				this.board.tl.moveTo(10,340,15,enchant.Easing.QUINT_EASEIN);
				this.board.tl.then(function(){
					panelDisp(true);
					game.popScene();
					timer.reset();
					timer.stop = false;
				});
			}
		});

		//ステージ管理
		/////////////////////////////////////////////////////////////////////////////
		var stage = new Scene();
		stage.time = 0;
		stage.startX = 0;
		stage.startY = 0;
		stage.beforeX = 0;
		stage.beforeY = 0;
		stage.num = 1;					//現在ステージ番号
		stage.max = 5;					//最終ステージ番号
		stage.tutorial = 0;
		stage.speed = sec(3);			//パネル通過フレーム数
		stage.selPanel = -1;			//選択中パネル
		stage.dir = 0;					//選択パネル移動軸 0:横軸 1:縦軸
		stage.clear = false;			//ステージクリアフラグ
		stage.clearOk = false;			//クリア条件満足フラグ
		stage.miss = false;				//ミスったフラグ
		stage.missStage = false;		//ステージ内ミスフラグ
		stage.flipFirstTime = false;	//パネルフリップ移動軸決定用
		stage.maxPanel = 0;				//最大通過可能パネル数
		stage.minPanel = 0;				//最短パネル数
		stage.dropPanel = 0;			//落下パネル数
		stage.passPanel = 0;			//通過パネル数
		stage.getItem = 0;				//アイテム取得数
		stage.leftPanel = 25;			//残りパネル数
		stage.chain = 0;				//チェイン数
		stage.setup = false;
		stage.onenterframe = function(){
			if( !this.setup )return;
			//時間切れ
			if( timer.now == 0 ){
				var msg = new Text(140,-20,"TIME UP!!");
				msg.tl.moveTo(140,140,30,enchant.Easing.ELASTIC_EASEOUT).then(function(){stage.removeChild(this);});
				this.addChild(msg);
				this.tl.delay(45).then(function(){
					life.dec();
					if( life.count == 0 )game.end( score, "時間切れ！SCORE:"+score );
					mask.tl.fadeIn(15);
					this.initStage();
				});
			}
			//ミス判定
			if( this.miss ){
				this.missStage = true;
				player.sprite.frame = 3;
				player.move = false;
				player.tl.clear();
				player.tl.moveBy(0,-15,5,enchant.Easing.QUINT_EASEINOUT).moveBy(0,15,5,enchant.Easing.QUINT_EASEINOUT);
				this.miss = false;
				var msg = new Text(140,-20,"MISS!");
				msg.tl.moveTo(140,150,30,enchant.Easing.ELASTIC_EASEOUT).fadeOut(15).then(function(){stage.removeChild(this);});
				this.addChild(msg);
				this.tl.delay(60).then(function(){
					life.dec();
					if( life.count == 0 ){
						if( !endless ){
							game.end( score, "STAGE"+this.num+" CLEARED. SCORE:"+score );
						}else{
							game.end( score, "EndlessMode SCORE:"+score );
						}
					}
					mask.tl.fadeIn(15);
					this.initStage();
				});
			}
			//ステージ別クリア条件判定
			switch(this.num){
				case 1:
					//無条件
					this.clearOk = true;
					break;
				case 2:
					//無条件
					this.clearOk = true;
					break;
				case 3:
				case 4:
					//全アイテム取得チェック
					if( !this.clearOk && this.allItemGet() ){
						this.clearOk = true;
						this.clearOkMsg();
					}
					break;
				case 5:
					if( !this.clearOk && this.getItem > 1 ){
						this.clearOk = true;
						this.clearOkMsg();
					}
					break;
				default:
			}
			//ステージクリア
			if( this.clearOk && this.clear ){
				this.clearMsg();
				this.tl.delay(90);
				//最短クリア
				if( this.passPanel == this.minPanel ){
					this.tl.then(function(){
						var msg = new Text(20,160,"SHORTCUT! 10000pts");
						msg.opacity = 0;
						msg.tl.fadeIn(15).delay(30).fadeOut(15).then(function(){stage.removeChild(this);});
						this.addChild(msg);
						score+=10000;
					}).delay(60);
				}
				//パーフェクト
				if( this.dropPanel == this.maxPanel ){
					this.tl.then(function(){
						var msg = new Text(30,160,"PERFECT! 20000pts");
						msg.opacity = 0;
						msg.tl.fadeIn(15).delay(30).fadeOut(15).then(function(){stage.removeChild(this);});
						this.addChild(msg);
						score+=20000;
					}).delay(60);
				}
				//ステージ内ノーミスクリア
				if( !this.missStage ){
					this.tl.then(function(){
						var msg = new Text(30,160,"NO MISS! 10000pts");
						msg.opacity = 0;
						msg.tl.fadeIn(15).delay(30).fadeOut(15).then(function(){stage.removeChild(this);});
						this.addChild(msg);
						score+=10000;
					}).delay(60);
				}

				//次ステージ移行
				if( this.num < this.max ){
					this.tl.then(function(){
						mask.tl.fadeIn(15);
					}).delay(15);
					this.tl.then(function(){
						this.num++;
						this.setup = false;
						this.missStage = false;
						this.initStage();
					});
				}else{
					this.tl.delay(60).then(function(){
						game.end( score, "ALL CLEAR！SCORE:"+score );
					});
				}
				this.clear = false;
			}

			//エンドレスモードの場合
			if( endless && !this.miss ){
				//パネル復活
//				if( this.time > sec(30) && this.time % sec(3) == 0 ){
				if( this.time > sec(30) && paneladd ){
					paneladd = false;
					for( var i = 0; i < 25; i++ ){
						if( !panels[i].using ){
							var x = rand(5);
							var y = rand(5);
							for( var j = 0; j < 10;j++ ){
								x = rand(5);
								y = rand(5);
								if( this.panelCheck(x,y) == -1 )break;
							}
							if( j < 10 ){
								var dice = rand(100);
								//曲がりパネルと直線パネルの出現比を55:45にする
								if( dice < 55 ){
									//曲がりパネル
									panels[i].frame = rand(4)+4;
								}else{
									//直線パネル
									panels[i].frame = rand(2)+1;
									dice = rand(100);
									if( dice < 5 )panels[i].frame = 3;	//５％で十字パネル
								}
								panels[i].px = x;	//パネルの５＊５座標
								panels[i].py = y;
								panels[i].ay = 10;
								panels[i].x = x * size+10;
								panels[i].y = y * size+15+10;
								if( userAgent == "Chrome" ){
									panels[i].scaleX = 0.9;
									panels[i].scaleY = 0.9;
								}else{
									panels[i].scaleX = 1;
									panels[i].scaleY = 1;
								}
								panels[i].select = false;	//選択中フラグ
								panels[i].flip = false;		//フリップ中フラグ
								panels[i].move = true;		//移動可能フラグ
								panels[i].onbear = false;	//クマが乗ったかフラグ
								panels[i].dir = 0;			//クマの進入方向 0:左 1:右 2:上 3:下
								panels[i].on = false;		//クマ乗っているかフラグ
								panels[i].drop = false;		//パネル落下中フラグ
								panels[i].using = true;
								panels[i].chain = 0;
								panels[i].image =  game.assets['panel.png'];
								panels[i].time = 0;
								panels[i].time2 = 0;
								panels[i].visible = true;
								panels[i].onenterframe = panelfunc;
								break;
							}
						}
					}
				}
				//アイテム投下
				if( this.time > sec(40) && (this.time+150) % sec(30) == 0 && !this.miss ){
//				if( this.time > sec(1) && this.time % sec(3) == 0 && !this.miss ){
					var x,y,a,p;
					var loop = false;
					var ct = 0;	//無限ループ防止カウンタ
					do{
						loop = false;
						x = rand(5);
						y = rand(5);
						a = this.panelCheck(x,y);
						if( a != -1 ){
							var p = panels[a];
							if( p.on || p.onbear || p.select || p.flip || p.drop )loop = true;
							//端でアイテムが置けないパネルの判断
							if( x == 0 ){
								if( p.frame == 1 || p.frame == 5 || p.frame == 7 )loop = true;
							}else if( x == 4 ){
								if( p.frame == 1 || p.frame == 4 || p.frame == 6 || p.frame == 3 )loop = true;
							}
							if( y == 0 ){
								if( p.frame == 2 || p.frame == 6 || p.frame == 7 )loop = true;
							}else if( y == 4 ){
								if( p.frame == 2 || p.frame == 4 || p.frame == 5 )loop = true;
							}
							//クマの四方は投下場所から除外
							var kx = ~~((player.x-10)/60); 
							var ky = ~~((player.y-10)/60);
							if( kx+1 == x || kx-1 == x ){
								if( ky == y )loop = true;
							}
							if( ky+1 == y || ky-1 == y ){
								if( kx == x )loop = true;
							}
						}else{
							loop = true;
						}
						if( this.itemCheck(x,y) != 0 )loop = true;
						ct++;
						if( ct > 10 )loop = false;
					}while( loop );
					if( ct > 10 ){
					}else{
						var i = y*5+x;
						var item = rand(3);
						switch(item){
							case 0:	//リンゴ
								items[i].frame = 15;
								items[i].point = 500;
								items[i].type = 1;
								items[i].time = sec(60);
								break;
							case 1:	//メロン
								items[i].frame = 18;
								items[i].point = 1000;
								items[i].type = 6;
								items[i].time = sec(42);
								break;
							case 2:	//スター
								items[i].frame = 30;
								items[i].point = 2000;
								items[i].type = 2;
								items[i].time = sec(30);
								break;
							case 3:	//爆弾
								items[i].frame = 24;
								items[i].point = 0;
								items[i].type = 5;
								items[i].time = sec(6);
								break;
							case 4:	//時計
								items[i].frame = 34;
								items[i].point = 0;
								items[i].type = 3;
								items[i].time = sec(30);
								break;
							default:
						}
						var j = this.panelCheck(items[i].px,items[i].py);
						if( j == -1 ){
							items[i].visible = false;
						}else{
							panels[j].move = false;
						}
						//ドロップ演出
						var dp = new Sprite(16,16);
						dp.image = game.assets['icon0.gif'];
						dp.frame = items[i].frame;
						dp.x = items[i].x;
						dp.y = items[i].y-330;
						dp.i = i;
						dp.tl.moveTo(items[i].x,items[i].y,sec(1),enchant.Easing.ELASTIC_EASEOUT);
						dp.tl.then(function(){items[i].visible = true;stage.removeChild(this);});
						stage.addChild(dp);
					}
				}
			}
			this.time++;
		}
		//指定座標のパネル番号を調べる　無しの場合は－１
		stage.panelCheck = function(x,y){
			if( x < 0 || x > 4 || y < 0 || y > 4 )return -1;
			for( var i = 0; i < 25; i++ ){
				var p = panels[i];
				if( p.using && p.px == x && p.py == y )return i;
			}
			return -1;
		}
		//指定座標のアイテムが有効か調べる
		stage.itemCheck = function(x,y){
			if( x < 0 || x > 4 || y < 0 || y > 4 )return false;
			var i = x+y*5;
			return items[i].visible;
		}
		//ステージ初期化
		stage.initStage = function(){
			if( !endless ){
				var number = new Text(100,-20,"STAGE "+this.num);
			}else{
				var number = new Text(60,-20,"ENDLESS MODE");
			}
			number.opacity = 0;
			number.tl.fadeIn(15).and().moveBy(0,160,30,enchant.Easing.QUINT_EASEINOUT).fadeOut(20);
			number.tl.then(function(){
				timer.reset();
				timer.stop = false;
				player.miss = false;
				player.move = true;
				player.sprite.visible = true;
				player.now = -1;
				player.tl.delay(120);
				mask.tl.fadeOut(15);
				initPanel(stage.num);
				stage.removeChild(this);
			});

			if( this.tutorial < this.num || endless ){
				number.tl.then(function(){
					panelDisp(false);
					game.pushScene(tutorial);
				});
				this.tutorial = this.num;
			}
			this.addChild(number);
			this.setup = false;
			this.clearOk = false;
			this.dropPanel = 0;	//落下パネル数
			this.passPanel = 0;	//通過パネル数
			this.leftPanel = 25;
			this.getItem = 0;		//アイテム取得数
		}
		//クリアメッセージ表示
		stage.clearMsg = function(){
			var cl = new Sprite(267,48);
			cl.image = game.assets['clear.png'];
			cl.x = 26;
			cl.y = 320;
			cl.tl.moveBy(0,-370,60).then(function(){stage.removeChild(this);});
			stage.addChild(cl);
		}
		//クリア条件達成メッセージ表示
		stage.clearOkMsg = function(){
			//ゴールパネル
			goalCover.tl.fadeOut(30);
		}
		//クリア条件チェック（全アイテム取得）
		stage.allItemGet = function(){
			for( var i = 0; i < 25; i++ ){
				if( itemData[i] < 5 && items[i].visible )return false;
			}
			return true;
		}
		stage.addEventListener('touchstart', function(e){
			this.flipFirstTime = true;
			this.startX = e.x;
			this.startY = e.y;
			this.beforeX = e.x;
			this.beforeY = e.y;
			this.selPanel = -2;	// 0 - 25:選択パネル番号 -1:移動不可パネル -2:空白
			this.left = -2;
			this.right = -2;
			this.up = -2;
			this.down = -2;

			//全パネル選択状況及びフリップ状況解除
			for( var i = 0; i < 25; i++ ){
				var p = panels[i];
				if( p.using ){
					p.select = false;
					p.flip = false;
				}
			}
			for( var i = 0; i < 25; i++ ){
				panels[i].select = false;
				//選択パネルの番号を取得
				if( panels[i].check(e.x,e.y) ){
					panels[i].select = true;
					this.selPanel = i;
					if( !panels[i].move || panels[i].onbear ){
						panels[i].select = false;
						this.selPanel = -1;
					}
				}
				//選択されたパネルの上下左右の番号を取得
				//左
				if( panels[i].check(e.x-60,e.y) ){
					this.left = i;
					layer_panel.removeChild(panels[i]);
					layer_panel.addChild(panels[i]);
					if( !panels[i].move || panels[i].onbear )this.left = -1;
				}
				//右
				if( panels[i].check(e.x+60,e.y) ){
					this.right = i;
					layer_panel.removeChild(panels[i]);
					layer_panel.addChild(panels[i]);
					if( !panels[i].move || panels[i].onbear )this.right = -1;
				}
				//上
				if( panels[i].check(e.x,e.y-60) ){
					this.up = i;
					layer_panel.removeChild(panels[i]);
					layer_panel.addChild(panels[i]);
					if( !panels[i].move || panels[i].onbear )this.up = -1;
				}
				//下
				if( panels[i].check(e.x,e.y+60) ){
					this.down = i;
					layer_panel.removeChild(panels[i]);
					layer_panel.addChild(panels[i]);
					if( !panels[i].move || panels[i].onbear )this.down = -1;
				}
			}
		});
		stage.addEventListener('touchmove', function(e){
			var moveX = this.beforeX - e.x;
			var moveY = this.beforeY - e.y;

			//移動量の制限
			var mx = Math.abs(this.startX-e.x);
			if( mx > size ){
				if( moveX < 0 ){
					moveX = -(mx-size);
				}else{
					moveX = (mx-size);
				}
				moveX = 0;
			}
			if( Math.abs(this.startY-e.y) > size ){
				moveY = 0;
			}

			//初回の移動量によって縦横の移動を固定する
			if( this.flipFirstTime ){
				if( Math.abs(moveX) > Math.abs(moveY) ){
					this.dir = 0;	//横軸
				}else{
					this.dir = 1;	//縦軸
				}
				this.flipFirstTime = false;
			}

			//横移動
			if( this.dir == 0 ){
				panels[this.selPanel].x -= moveX;
				if( panels[this.selPanel].x < 10 )panels[this.selPanel].x = 10;
				if( panels[this.selPanel].x > 310-size )panels[this.selPanel].x = 310-size;

				//フリップ対象パネルの移動
				if( this.startX - e.x > 0 ){
					if( this.left > -1 ){
						panels[this.left].x += moveX;
						panels[this.left].flip = true;
					}
					if( this.right > -1 )panels[this.right].flip = false;	//逆側はフリップ解除
				}else{
					if( this.right > -1 ){
						panels[this.right].x += moveX;
						panels[this.right].flip = true;
					}
					if( this.left > -1 )panels[this.left].flip = false;	//逆側はフリップ解除
				}
			}

			//縦移動
			if( this.dir == 1 ){
				panels[this.selPanel].y -= moveY;
				if( panels[this.selPanel].y < 15 )panels[this.selPanel].y = 15;
				if( panels[this.selPanel].y > 315-size )panels[this.selPanel].y = 315-size;
				//フリップ対象パネルの移動
				if( this.startY - e.y > 0 ){
					if( this.up > -1 ){
						panels[this.up].y += moveY;
						panels[this.up].flip = true;
					}
					if( this.down > -1 )panels[this.down].flip = false;	//逆側はフリップ解除
				}else{
					if( this.down > -1 ){
						panels[this.down].y += moveY;
						panels[this.down].flip = true;
					}
					if( this.up > -1 )panels[this.up].flip = false;	//逆側はフリップ解除
				}
			}
			this.beforeX = e.x;
			this.beforeY = e.y;
		});
		stage.addEventListener('touchend', function(e){
			//総移動量
			var moveX = this.startX - e.x;
			var moveY = this.startY - e.y;

			//一定以上移動してたらフリップ成立
			if( this.dir == 0 && Math.abs(moveX) > 30 ){
				if( moveX > 0 ){
					if( this.left != -1 && panels[this.selPanel].px > 0 ){
						panels[this.selPanel].px--;
						panels[this.selPanel].chain = 0;
						panels[this.selPanel].image = game.assets['panel.png'];
						if( this.left != -2 ){
							panels[this.left].px++;
							panels[this.left].chain = 0;
							panels[this.left].image = game.assets['panel.png'];
						}
					}
				}else{
					if( this.right != -1 && panels[this.selPanel].px < 4 ){
						panels[this.selPanel].px++;
						panels[this.selPanel].chain = 0;
						panels[this.selPanel].image = game.assets['panel.png'];
						if( this.right != -2 ){
							panels[this.right].px--;
							panels[this.right].chain = 0;
							panels[this.right].image = game.assets['panel.png'];
						}
					}
				}
			}
			if( this.dir == 1 && Math.abs(moveY) > 30 ){
				if( moveY > 0 ){
					if( this.up != -1 && panels[this.selPanel].py > 0 ){
						panels[this.selPanel].py--;
						panels[this.selPanel].chain = 0;
						panels[this.selPanel].image = game.assets['panel.png'];
						if( this.up != -2 ){
							panels[this.up].py++;
							panels[this.up].chain = 0;
							panels[this.up].image = game.assets['panel.png'];
						}
					}
				}else{
					if( this.down != -1 && panels[this.selPanel].py < 4 ){
						panels[this.selPanel].py++;
						panels[this.selPanel].chain = 0;
						panels[this.selPanel].image = game.assets['panel.png'];
						if( this.down != -2 ){
							panels[this.down].py--;
							panels[this.down].chian = 0;
							panels[this.down].image = game.assets['panel.png'];
						}
					}
				}
			}

			//全パネルの状況をチェックして不整合なものがあったら修正する
			//全パネル選択状況及びフリップ状況解除
			for( var i = 0; i < 25; i++ ){
				var p = panels[i];
				if( p.using ){
					p.select = false;
					p.flip = false;
					//パネルの重複検出（しなくても大丈夫そう）
/*
					for( var j = 0; j < 25; j++ ){
						if( i == j )continue;
						var p2 = panels[j];
						if( p2.using ){
							if( p.px == p2.px && p.py == p2.py ){
								//パネルを空いてるスペースに弾き出す
								var px = p2.px;
								var py = p2.py;
								if( stage.panelCheck(px+1,py) == -1 )p2.px++;
								if( stage.panelCheck(px-1,py) == -1 )p2.px--;
								if( stage.panelCheck(px,py+1) == -1 )p2.py++;
								if( stage.panelCheck(px,py-1) == -1 )p2.py--;
							}
						}
					}
*/
				}
			}
		});
		game.pushScene(stage);
		game.pushScene(title);

		//レイヤー管理グループ
		/////////////////////////////////////////////////////////////////////////////
		var layer_panel = new Group();		stage.addChild(layer_panel);
		var layer_cover = new Group();		stage.addChild(layer_cover);
		var layer_item = new Group();		stage.addChild(layer_item);
		var layer_player = new Group();		stage.addChild(layer_player);
		var layer_mask = new Group();		stage.addChild(layer_mask);
		var layer_system = new Group();		stage.addChild(layer_system);

		//マスク
		/////////////////////////////////////////////////////////////////////////////
		var mask = new Sprite(320,320);
		mask.image = game.assets['mask.png'];
		mask.opacity = 1;
		mask.visible = true;
		layer_mask.addChild(mask);

		//スコア表示
		/////////////////////////////////////////////////////////////////////////////
		var scoreLabel = new Label( "SCORE : " + score );
		scoreLabel.x = 5;
		scoreLabel.y = 0;
		scoreLabel.color = "#ffff00";
		scoreLabel.font = "bold";
		scoreLabel.onenterframe=function(){
			this.text = "SCORE : " + score;
		}
		layer_system.addChild( scoreLabel );

		//タイマー
		/////////////////////////////////////////////////////////////////////////////
		var timer = new Label("");
		timer.x = 251;
		timer.y = 0;
		timer.color = "#ffff00";
		timer.font = "bold";
		timer.start = 0;		//起動時点時間
		timer.before = 0;		//前フレーム時間
		timer.time = 0;			//経過フレーム数
		timer.stop = true;		//タイマー停止フラグ
		timer.over = false;		//時間切れフラグ
		timer.max = 90;			//制限時間
		timer.now = timer.max;	//現在時間
		timer.text = "TIME : " + timer.now.toFixed(2);
		timer.addEventListener('enterframe', function(){
			if( this.time == 0 ){
				this.start = new Date().getTime();
				this.before = timer.start;
				this.now = this.max;
				this.over = false;
			}
			var now = new Date().getTime();			//現在時間(ms)
			var sec = ((now - this.start)/1000);	//startから現在の経過秒数
			if( !this.stop ){
				this.now = this.max-sec.toFixed(2);
			}else{
				this.start += now - this.before;	//タイマー停止中はスタート時間を進める＝相対時間が変わらない
			}
			this.text = "TIME : " + this.now.toFixed(2);
			if( this.now > 0 ){
				this.text = "TIME : " + this.now.toFixed(2);
			}else{
				this.text = "TIME : 0.00";
				this.now = 0;
			}
			this.time++;
			this.before = now;
		});
		//タイマーリセット
		timer.reset = function(){this.time=0;}
//		layer_system.addChild(timer);

		//ライフ表示
		/////////////////////////////////////////////////////////////////////////////
		var life = new Group();
		life.count = 3;
		life.x = 260;
		life.y = 0;
		life.life = new Array(life.count);
		for( i = 0; i < life.count; i++ ){
			life.life[i] = new Sprite( 16, 16 );
			life.life[i].image = game.assets['icon0.gif'];
			life.life[i].frame = 10;
			life.life[i].scaleX = 0.5;
			life.life[i].scaleY = 0.5;
			life.life[i].x = i * 9+20;
			life.life[i].y = -2;
			life.addChild(life.life[i]);
		}
		life.inc = function(){
			this.life[this.count].tl.fadeIn(30);
			this.count++;
		}
		life.dec = function(){
			this.count--;
			this.life[this.count].tl.fadeOut(30);
		}
		life.text = new Label("Life");
		life.text.x = 0;
		life.text.y = 0;
		life.text.color = "#ffff00";
		life.text.font = "bold";
		life.addChild(life.text);
		layer_system.addChild(life);

		//プレイヤ管理
		/////////////////////////////////////////////////////////////////////////////
		var shot = false;
		var player = new Group;
		player.sprite = new Sprite(32,32);
		player.sprite.image = game.assets['chara1.gif']
		player.sprite.frame = 0;
		player.sprite.visible = false;
		player.addChild(player.sprite);
		player.x = 30-16+10;
		player.y = 30+15-32;
		player.vx = 0;
		player.vy = 0;
		player.time = 0;
		player.jump = true;
		player.yPrev = player.y;
		player.F = 0;
		player.now = -1;
		player.move = true;	//移動可フラグ
		player.beforeX = player.x;
		player.beforeY = player.y;
		player.miss = false;	//ミスしたよフラグ
		player.onenterframe = function(){
			if( this.miss || stage.miss )return;
			if( !this.sprite.visible )return;

			//スプライトのアニメーション
			if( this.time % 4 == 0 && this.move ){
				this.sprite.frame++;
				if( this.sprite.frame > 2 )this.sprite.frame = 0;
			}
			//左右の向き
			if( this.beforeX != this.x ){
				if( this.beforeX > this.x ){
					this.sprite.scaleX = -1;
				}else{
					this.sprite.scaleX = 1;
				}
			}

			//乗ってるパネル判定
			var now = panelCheck( this.x+16, this.y+32 );
			if( now < 0 && this.time > 30 ){
				this.miss = true;
				stage.miss = true;
			}
			if( now != this.now && now > -1 ){
				if( !setTL(now) ){
					this.miss = true;
					stage.miss = true;
				}
				this.now = now;
			}

			//アイテム取得判定
			for( var i = 0; i < 25; i++ ){
				if( !items[i].visible )continue;
				if( items[i].within(this.sprite,16) ){
					switch(items[i].type){
						case 1:	//リンゴ
						case 2:	//スター
						case 6:	//メロン
							stage.getItem++;
							//ポイント表示
							var pt = new Text( this.x-5, this.y, ""+items[i].point );
							pt.opacity = 0;
							pt.point = items[i].point;
							pt.tl.fadeIn(1).moveBy(0,-30,30).and().fadeOut(30).then(function(){score+=this.point;stage.removeChild(this);});
							stage.addChild(pt);
							break;
						case 3:	//時計
							this.numGetItem++;
							this.tl.delay(30);
							var pt = new Text( this.x-5, this.y, "STOP" );
							player.tl.pause();
							pt.opacity = 0;
							pt.point = items[i].point;
							pt.tl.fadeIn(1).moveBy(0,-30,30).and().fadeOut(30).delay(90);
							pt.tl.then(function(){
								player.tl.resume();
								stage.removeChild(this);
							});
							stage.addChild(pt);
							break;
						case 5:	//爆弾
							this.miss = true;
							stage.miss = true;
							var bm = new Sprite(16,16);
							bm.image = game.assets['effect.gif'];
							bm.x = this.x+8;
							bm.y = this.y;
							bm.frame = 0;
							bm.time = 0;
							bm.onenterframe = function(){
								this.time++;
								if( this.time % 3 == 0 )this.frame++;
								if( this.frame == 4 ){
									stage.removeChild(this);
								}
							}
							stage.addChild(bm);
							break;
					}
					items[i].visible = false;
				}
			}
			this.beforeX = this.x;
			this.beforeY = this.y;
			this.time++;
		}
		layer_player.addChild(player);

		//チェイン数表示
		/////////////////////////////////////////////////////////////////////////////
		var chainDisp = new MutableText(8,-16,64,"0");
		chainDisp.onenterframe = function(){
			if( !endless )this.visible = false;
			if( stage.chain == 0 ){
				this.visible = false;
			}else{
				this.visible = true;
				this.text = stage.chain+"";
				this.x = 16-this.text.length*8;
			}
		}
		player.addChild(chainDisp);

		//ガールフレンド
		/////////////////////////////////////////////////////////////////////////////
		var lover = new Sprite(32,32);
		lover.image = game.assets['chara1.gif'];
		lover.frame = 10;
		lover.visible = false;
		layer_player.addChild(lover);

		//パネル準備
		/////////////////////////////////////////////////////////////////////////////
		var panels = new Array(24);
		for( var i = 0; i < 25; i++ ){
			panels[i] = new Sprite(size,size);
			panels[i].image = game.assets['panel.png'];
			panels[i].visible = false;
			panels[i].chain = 0;	//チェイン判定用
			//接触判定
			panels[i].check = function(x,y){
				if( this.drop || this.flip || this.select )return false;
				var px = this.px * 60+10;
				var py = this.py * 60+15;
				if( px <= x && x <= px+size &&  py <= y && y <= py+size )return true;
				return false;
			}
			layer_panel.addChild(panels[i]);
		}

		//クリア条件未達成時ゴールパネル表示
		/////////////////////////////////////////////////////////////////////////////
		var goalCover = new Sprite(size,size);
		goalCover.image = game.assets['panel.png'];
		goalCover.frame = 0;
		goalCover.visible = false;
		layer_cover.addChild(goalCover);

		//アイテム準備
		/////////////////////////////////////////////////////////////////////////////
		var items = new Array(24);
		for( var y = 0; y < 5; y++ ){
			for( var x = 0; x < 5; x++ ){
				var i = y*5+x;
				items[i] = new Sprite(16,16);
				items[i].image = game.assets['icon0.gif'];
				items[i].frame = 15;
				items[i].visible = false;
				items[i].x = x*60+32;
				items[i].y = y*60+30;
				items[i].px = x;
				items[i].py = y;
				items[i].tl.moveBy(0,-16,30,enchant.Easing.QUAD_EASEINOUT).moveBy(0,16,30,enchant.Easing.QUAD_EASEINOUT).loop();
				items[i].time = 0;
				items[i].onenterframe = function(){
					if( endless && this.visible ){
						if( this.time < 0 ){
							this.visible = false;
							var i = stage.panelCheck(this.px,this.py);
							if( i != -1 ){
								panels[i].move = true;
							}
							var bm = new Sprite(16,16);
							bm.image = game.assets['effect.gif'];
							bm.x = this.x;
							bm.y = this.y;
							bm.frame = 0;
							bm.time = 0;
							bm.onenterframe = function(){
								this.time++;
								if( this.time % 3 == 0 )this.frame++;
								if( this.frame == 4 ){
									stage.removeChild(this);
								}
							}
							stage.addChild(bm);
						}
					}
					this.time--;
				}
				layer_item.addChild(items[i]);
			}
		}

		//パネル＆アイテム初期化
		/////////////////////////////////////////////////////////////////////////////
		var initPanel = function(num){
			var dice = 0;
			stage.maxPanel = 0;
			switch(num){
				case 0:
					dice = rand(3);
					if( dice == 0 ){
						panelData = panelData0_1;
						itemData = itemData0_1;
					}else if( dice == 1 ){
						panelData = panelData0_2;
						itemData = itemData0_2;
					}else{
						panelData = panelData0_3;
						itemData = itemData0_3;
					}
					break;
				case 1:
					panelData = panelData1;
					itemData = itemData1;
					break;
				case 2:
					panelData = panelData2;
					itemData = itemData2;
					break;
				case 3:
					panelData = panelData3;
					itemData = itemData3;
					break;
				case 4:
					panelData = panelData4;
					itemData = itemData4;
					break;
				case 5:
					panelData = panelData5;
					itemData = itemData5;
					break;
				default:
					panelData = panelData1;
					itemData = itemData1;
			}

			//配列内シャッフル
			if( !debug ){
				for( i = 0; i < 10; i++ ){
					var a = rand(24), b = rand(24);
					if( a == b ){
						i--;
						continue;
					}
					if( itemData[a] != 0 || itemData[b] != 0 ){
						i--;
						continue;
					}
					var tmp = panelData[a];
					panelData[a] = panelData[b];
					panelData[b] = tmp;

					tmp = itemData[a];
					itemData[a] = itemData[b];
					itemData[b] = tmp;
				}
			}

			goalCover.visible = false;

			//パネル情報初期化
			for( var y = 0; y < 5; y++ ){
				for( var x = 0; x < 5; x++ ){
					var i = y*5+x;
					//パネル
					panels[i].frame = panelData[i];
					panels[i].px = x;	//パネルの５＊５座標
					panels[i].py = y;
					panels[i].ay = 5;
					panels[i].x = x * size+10;
					panels[i].y = y * size+15;
					if( userAgent == "Chrome" ){
						panels[i].scaleX = 0.9;
						panels[i].scaleY = 0.9;
					}else{
						panels[i].scaleX = 1;
						panels[i].scaleY = 1;
					}
					panels[i].select = false;	//選択中フラグ
					panels[i].flip = false;		//フリップ中フラグ
					panels[i].move = true;		//移動可能フラグ
					if( itemData[i] != 0　&& itemData[i] != 6 )panels[i].move = false;	//アイテムがあるパネルは動かせない
					panels[i].onbear = false;	//クマが乗ったかフラグ
					panels[i].dir = 0;			//クマの進入方向 0:左 1:右 2:上 3:下
					panels[i].on = false;		//クマ乗っているかフラグ
					panels[i].drop = false;		//パネル落下中フラグ
					panels[i].using = true;
					panels[i].time = 0;
					panels[i].time2 = 0;
					panels[i].visible = true;
					panels[i].onenterframe = panelfunc;

					if( itemData[i] != 5 )stage.maxPanel++;	//通過可能パネル数

					//ステージ３以降は条件未達成ゴールを表示する
					if( itemData[i] == 9 && stage.num > 2 ){
						goalCover.frame = panels[i].frame+4;
						goalCover.x = panels[i].x;
						goalCover.y = panels[i].y;
						goalCover.visible = true;
						goalCover.opacity = 1.0;
					}
				}
			}
			stage.maxPanel--;	//ゴール分を除く

			//アイテム情報初期化
			lover.visible = false;
			for( var y = 0; y < 5; y++ ){
				for( var x = 0; x < 5; x++ ){
					var i = y*5+x;
					switch(itemData[i]){
						case 1:	//リンゴ
							items[i].frame = 15;
							items[i].point = 500;
							items[i].visible = true;
							items[i].type = itemData[i];
							items[i].time = sec(60);
							break;
						case 2:	//スター
							items[i].frame = 30;
							items[i].point = 1000;
							items[i].visible = true;
							items[i].type = itemData[i];
							items[i].time = sec(60);
							break;
						case 3:	//時計
							items[i].frame = 34;
							items[i].point = 0;
							items[i].visible = true;
							items[i].type = itemData[i];
							items[i].time = sec(60);
							break;
						case 4:	//ライフ
							items[i].frame = 10;
							items[i].point = 0;
							items[i].visible = true;
							items[i].type = itemData[i];
							items[i].time = sec(60);
							break;
						case 5:	//爆弾
							items[i].frame = 24;
							items[i].point = 0;
							items[i].visible = true;
							items[i].type = itemData[i];
							items[i].time = sec(12);
							break;
						case 8:	//スタート地点
							player.x = x*size+30-16+10;
							player.y = y*size+30+15-32;
							player.sprite.scaleX = 1;
							player.beforeX = player.x;
							player.beforeY = player.y;
							break;
						case 9:	//ゴール
							if( panelData[i] == 12 ){
								lover.x = x * size+10;
								lover.y = y * size+13;
								lover.scaleX = 1;
							}else{
								lover.x = x * size+10+35;
								lover.y = y * size+13;
								lover.scaleX = -1;
							}
							lover.visible = true;
							break;
						default:
					}
				}
			}
			stage.setup = true;
		}

		//足元パネルチェック
		/////////////////////////////////////////////////////////////////////////////
		var panelCheck = function(x,y){
			for( var i = 0; i < 25; i++ ){
				if( panels[i].check(x,y) )return i;
			}
			return -1;
		}

		//パネルの表示、非表示		
		var panelDisp = function(flag){
			for( var i = 0; i < 25; i++ ){
				panels[i].visible = flag;
			}
		}

		//チェイン用カウンタ加算
		/////////////////////////////////////////////////////////////////////////////
		var chainAdd = function(){
			if( !endless )return;
			for( var i = 0; i < 25; i++ ){
				if( panels[i].using && !panels[i].drop ){
					var pnl = panels[i];
					pnl.chain++;
					if( pnl.chain > 5 && pnl.image == game.assets['panel.png'] ){
						pnl.image = game.assets['panel2.png'];
						//パネル変更エフェクト
						var fl = new Sprite(60,60);
						fl.image = game.assets['panel.png'];
						fl.x = pnl.x;
						fl.y = pnl.y;
						fl.frame = pnl.frame;
						fl.tl.fadeOut(15).then(function(){layer_panel.addChild(this);});
						layer_panel.addChild(fl);
					}
				}
			}
			return -1;
		}

		//チェイン判定（エンドレスモードのみ）
		/////////////////////////////////////////////////////////////////////////////
		var chainCheck = function(panel){
			if( panel.chain > 4 && endless ){
				stage.chain++;
				if( stage.chain == 5 || stage.chain % 10 == 0 ){
					//ポイント表示
					var text = stage.chain+" CHAIN!";
					var pt = new Text( 160-(text.length/2*16), 320, text );
					pt.opacity = 0;
					pt.point = 5000*stage.chain/5;
					pt.tl.delay(30).fadeIn(1).moveBy(0,-160-8,30,enchant.Easing.ELASTIC_EASEOUT).delay(30);
					pt.tl.then(function(){score+=this.point;stage.removeChild(this);});
					stage.addChild(pt);
					text = "BONUS"+pt.point;
					var pt2 = new Text( 160-(text.length/2*16), 320, text );
					pt2.opacity = 0;
					pt2.point = 5000*stage.chain/5;
					pt2.tl.delay(45).fadeIn(1).moveBy(0,-160+8,30,enchant.Easing.ELASTIC_EASEOUT).delay(30);
					pt2.tl.then(function(){score+=this.point;stage.removeChild(this);});
					stage.addChild(pt2);
				}
			}else{
				stage.chain = 0;
			}
		}


		//ＴＬ設定
		/////////////////////////////////////////////////////////////////////////////
		var setTL = function(num){
			if( num < 0 )return false;

			//パネルのどちらから進入したか判定
			var x = panels[num].x+30;
			var y = panels[num].y+30;
			var dir = 0;
			if( player.x+16 < x-20 )dir = 0;	//左
			if( player.x+16 > x+20 )dir = 1;	//右
			if( player.y+32 < y-20 )dir = 2;	//上
			if( player.y+32 > y+20 )dir = 3;	//下
			panels[num].dir = dir;
			var time = stage.speed;
			var goal = false;
			switch(panels[num].frame){
				case 1:		//左ー右
					if( dir == 0 ){
						player.tl.moveBy( size, 0, time );
					}else if( dir == 1 ){
						player.tl.moveBy( -size, 0, time );
					}else{
						return false;
					}
					break;
				case 2:		//上ー下
					if( dir == 2 ){
						player.tl.moveBy( 0, size, time );
					}else if( dir == 3 ){
						player.tl.moveBy( 0, -size, time );
					}else{
						return false;
					}
					break;
				case 3:		//十字
					if( dir == 0 ){
						player.tl.moveBy( size, 0, time );
					}else if( dir == 1 ){
						player.tl.moveBy( -size, 0, time );
					}else if( dir == 2 ){
						player.tl.moveBy( 0, size, time );
					}else if( dir == 3 ){
						player.tl.moveBy( 0, -size, time );
					}else{
						return false;
					}
					break;
				case 4:		//下ー右
					if( dir == 3 ){
						player.tl.moveBy( size, 0, time );
					}else if( dir == 1 ){
						player.tl.moveBy( 0, size, time );
					}else{
						return false;
					}
					break;
				case 5:		//左ー下
					if( dir == 0 ){
						player.tl.moveBy( 0, size, time );
					}else if( dir == 3 ){
						player.tl.moveBy( -size, 0, time );
					}else{
						return false;
					}
					break;
				case 6:		//上ー右
					if( dir == 2 ){
						player.tl.moveBy( size, 0, time );
					}else if( dir == 1 ){
						player.tl.moveBy( 0, -size, time );
					}else{
						return false;
					}
					break;
				case 7:		//左ー上
					if( dir == 0 ){
						player.tl.moveBy( 0, -size, time );
					}else if( dir == 2 ){
						player.tl.moveBy( -size, 0, time );
					}else{
						return false;
					}
					break;
				//スタート用パネル
				case 8:		//ー右
					player.tl.moveBy( size, 0, time );
					break;
				case 9:		//－下
					player.tl.moveBy( 0, size, time );
					break;
				case 10:		//ー左
					player.tl.moveBy( -size, 0, time );
					break;
				case 11:		//－上
					player.tl.moveBy( 0, -size, time );
					break;
				//ゴール用パネル
				case 12:		//ー右
					if( dir != 1 )return false;
					goal = true;
					break;
				case 13:		//－下
					if( dir != 3 )return false;
					goal = true;
					player.tl.then(function(){this.sprite.scaleX = 1;});	//必ず右向きに
					break;
				case 14:		//ー左
					if( dir != 0 )return false;
					goal = true;
					break;
				case 15:		//－上
					if( dir != 2 )return false;
					goal = true;
					player.tl.then(function(){this.sprite.scaleX = 1;});	//必ず右向きに
					break;
				default:
					return false;
			}
			//クリア条件達成後ゴール
			if( goal && stage.clearOk ){
				stage.clear = true;
				timer.stop = true;
				player.tl.then(function(){
					this.move = false;
					this.frame = 0;
					var love = new Sprite(16,16);
					love.image = game.assets['icon0.gif'];
					love.x = player.x+16;
					love.y = player.y-10;
					love.frame = 10;
					love.tl.moveBy(0,-32,60).and().fadeOut(60).then(function(){stage.removeChild(this);});
					stage.addChild(love);
				});
			}
			//クリア条件達成前ゴール
			if( goal && !stage.clearOk ){
				player.miss = true;
				stage.miss = true;
			}

			chainCheck(panels[num]);
//			stage.tl.delay(30).then(function(){chainAdd();});
			chainAdd();
			return true;
		}
		//パネル制御ルーチン（パネルonenterfrane用）
		/////////////////////////////////////////////////////////////////////////////
		var panelfunc = function(){
			if( !this.visible || player.miss )return;
			if( !this.drop ){
				if( this.select ){
					//選択中
					if( userAgent == "Chrome" ){
						this.scaleX -= 0.02;
						this.scaleY -= 0.02;
						if( this.scaleX < 0.90 ){
							this.scaleX = 0.90;
							this.scaleY = 0.90;
						}
					}else{
//						this.scaleX = 0.90;
//						this.scaleY = 0.90;
					}
				}else{
					//非選択中
					if( userAgent == "Chrome" ){
						this.scaleX += 0.02;
						this.scaleY += 0.02;
						if( this.scaleX > 1.0 ){
							this.scaleX = 1.0;
							this.scaleY = 1.0;
						}
					}else{
//						this.scaleX = 1.0;
//						this.scaleY = 1.0;
					}
					if( this.ay > 0 ){	
						this.ay-=1;
						this.opacity+=0.2;
					}
					var x = this.px * size+10;
					var y = this.py * size+15+this.ay*2;

					if( !this.flip ){
						if( x != this.x )this.x = x;
						if( y != this.y )this.y = y;
					}
				}
			}else{
				this.scaleX -= 0.01;
				this.scaleY -= 0.01;
				this.opacity -= 0.1;
				this.y += 1;
				if( this.opacity < 0 ){
					this.scaleX = 0;
					this.scaleY = 0;
					this.opacity = 1;
					this.x = -100;
					this.px = -100;
					this.drop = false;
					this.using = false;
				}
			}
	
			//クマが乗ってるかチェック
			if( !this.select && this.check(player.x+16,player.y+32) ){
				this.onbear = true;
			}else{
				this.onbear = false;
			}
			if( this.onbear && !this.on ){
				layer_panel.removeChild(this);
				layer_panel.addChild(this);
				this.on = true;	//乗ったよフラグ
			}
			//降りたのでパネルを落とす（十字パネル以外）
			if( !this.onbear && this.on && this.frame != 3 ){
				this.tl.delay(10).then(function(){this.drop = true;});
				this.on = false;

				//ポイント表示
				var text = "1000";
				var pt = new Text( this.x+28-text.length*8, this.y+14, text );
				pt.opacity = 0;
				pt.tl.delay(15).fadeIn(1).moveBy(0,-30,30).and().fadeOut(30).then(function(){stage.removeChild(this);});
				stage.addChild(pt);
				score+=1000;

				stage.dropPanel++;
				stage.passPanel++;
				paneladd = true;
			}
			//十字パネルは降りたら直線パネルに変える
			if( !this.onbear && this.on && this.frame == 3 ){
				this.on = false;
				this.drop = false;
				this.move = true;	//移動可能パネルに変更

				//パネル変更エフェクト
				this.tl.delay(10).fadeOut(10).then(function(){
					if( this.dir == 0 ||  this.dir == 1 ){
						this.frame = 2;
					}else{
						this.frame = 1;
					}
				}).fadeIn(1);
				var fl = new Sprite(60,60);
				fl.image = this.image;
				fl.x = this.x;
				fl.y = this.y;
				if( this.dir == 0 ||  this.dir == 1 ){
					fl.frame = 2;
				}else{
					fl.frame = 1;
				}
				layer_panel.addChild(fl);

				fl.tl.fadeIn(30).then(function(){layer_panel.removeChild(this);});
				layer_panel.removeChild(this);
				layer_panel.addChild(this);

				//ポイント表示
				var text = "1000";
				var pt = new Text( this.x+28-text.length*8, this.y+14, text );
				pt.opacity = 0;
				pt.tl.delay(15).fadeIn(1).moveBy(0,-30,30).and().fadeOut(30).then(function(){stage.removeChild(this);});
				stage.addChild(pt);
				score+=1000;

				stage.passPanel++;
			}
			this.time++;
		}
	}//game.onload
	game.start();
};
