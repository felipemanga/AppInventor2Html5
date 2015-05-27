var __SpriteCache = {};
var __dirtyCanvases = [];

function __redrawCanvases(){
	for( var i=0, c; c=__dirtyCanvases[i]; ++i )
	{
		if( !c.__dirty ) 
			continue;
		c.Clear();
		c.__dirty = false;
		var sorted = c.children.sort(function(a, b){ 
			var d = (a.__properties.Z||0) - (b.__properties.Z||0); 
			if( d < 0 ) return -1;
			if( d > 0 ) return 1;
			return 0;
		});
		for( var j=0, child; child=sorted[j]; ++j )
		{
			var image = child.__image;
			if( !image || !image.__isLoaded || !child.__properties.Visible ) 
				continue;
			var w = child.Width, h = child.Height;
			if( !w || !h ) continue;
			if( isNaN(child.X) || isNaN(child.Y) )
			{
				console.warn("nan");
				continue;
			}
			c.ctx2d.drawImage(image, child.X, child.Y, w, h);
		}
	}
	__dirtyCanvases.length = 0;
}

defineComponent("ImageSprite", "Component", function ImageSprite( ui ){
	this.__image = null;
	this.SUPER(ui);
},{
	set$Z:function(z){
		if( z == this.__properties.Z ) return;
		this.__properties.Z = parseFloat(z);
		if( this.parent ) this.parent.__dirty = true;
	},
	set$X:function(x){
		if( x == this.__properties.X ) return;
		this.__properties.X = parseInt(x);
		if( this.parent ) this.parent.__dirty = true;
	},
	set$Y:function(y){
		if( y == this.__properties.Y ) return;
		this.__properties.Y = parseInt(y);
		if( this.parent ) this.parent.__dirty = true;
	},
	MoveTo:function(x, y){
		if( x == this.__properties.X && y == this.__properties.Y ) return;
		this.__properties.X = parseInt(x);
		this.__properties.Y = parseInt(y);
		if( this.parent ) this.parent.__dirty = true;
	},
	set$Picture:function(file){
		if( file == this.__properties.Picture ) return;
		this.__properties.Picture = file;
		var THIS=this;

		if( this.__image && this.__image.sprites && this.__image.sprites[this.__uid] == this )
			delete this.__image.sprites[this.__uid];

		if( file in __SpriteCache )
		{
			this.__image = __SpriteCache[file];
			if( !this.__image.__isLoaded ) this.__image.sprites[this.__uid] = this;
			if( this.parent ) this.parent.__dirty = true;
		}
		else
		{
			__SpriteCache[file] = this.__image = new Image();
			this.__image.sprites = {};
			this.__image.sprites[this.__uid] = this;
			console.log("Loading sprite", file);
			__SpriteCache[file].addEventListener("load", function(){
					var img = __SpriteCache[file];
					img.__isLoaded = true;
					for( var k in img.sprites )
					{
						var com = img.sprites[k];
						if( !("Height" in com.ui) ) 
							com.__properties.Height = com.__image.height;
						if( !("Width" in com.ui) ) 
							com.__properties.Width = com.__image.width;
					}
					if( THIS.parent ) THIS.parent.__dirty = true;
				});
			if( file.match(/^https?:\/\//i) )
			{
				__SpriteCache[file].src = file;
			}
			else
			{
				LIB.getFileBinary("assets/" + file, function(data){
					var ext = file.match(/\.([a-zA-Z]+)$/) || [0, "png"];
					ext = ext[1];
					var fmt = "data:image/"+ext+";base64,"
					__SpriteCache[file].src = fmt + btoa(data);
				});
			}
		}
		
		if( !("Height" in THIS.ui) ) 
			THIS.__properties.Height = THIS.__image.height;
		if( !("Width" in THIS.ui) ) 
			THIS.__properties.Width = THIS.__image.width;
	}
});

defineComponent("Canvas", "ComponentContainer", function Canvas( ui )
{
    this.SUPER( ui, "canvas" );
    var ctx = this.ctx2d = this.dom.getContext("2d");
    this.__dirty = this.children && !!this.children.length;

	if( this.children )
	{
		for( var i=0, c; c=this.children[i]; ++i )
			c.Z = c.Z || i/1000;
	}

	if( !ui.BackgroundColor ) this.BackgroundColor = new LIB.Color([255,255,255,255]);
	this.PaintColor = new LIB.Color(0,0,0);
	this.addMethod( "Clear", function(){
		this.dom.height = this.Height;
		this.dom.width = this.Width;
		var oldFill = ctx.fillStyle;
		if( this.__image )
		{
			ctx.drawImage(this.__image, 0,0,this.Width, this.Height);
		}
		else
		{
			ctx.fillStyle = this.clearColor;
			ctx.fillRect(0,0,this.Width, this.Height);
			ctx.fillStyle = oldFill;
		}
		// ctx.beginPath();
	});

	var polygonMode = false;
	var polygonFill = false;
	this.addMethod( "DrawCircle", function(x, y, radius, fill){
		if( x == -100 && y == -100 && radius < 0 )
		{
			px = py = undefined;
			if( radius == -1 )
			{
				polygonMode = true;
				polygonFill = fill;
				return;
			}
			if( radius == -2 )
			{
				polygonMode = false;
				ctx.closePath();
				if( polygonFill ) ctx.fill();
				ctx.stroke();
				return;
			}
		}
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
		ctx.closePath();
		if( fill ) ctx.fill();
		ctx.stroke();
	})

	var px, py;
	this.addMethod( "DrawLine", function(x1, y1, x2, y2){
		if( !polygonMode )
		{
			ctx.moveTo(x1, y1);
		}
		else if( x1 != px || y1 != py )
		{
			if( px !== undefined )
			{
				ctx.closePath();
				if( polygonFill ) ctx.fill();
				ctx.stroke();
			}
			ctx.beginPath();
			ctx.moveTo(x1, y1);
		}

		ctx.lineTo(x2, y2);

		if( !polygonMode )
			ctx.stroke();
		px = x2; py = y2;
	});
},{
	__onclick:function(com, evt){
		var pick = null;
		var pickZ = null;
		for( var i=0, c; c=this.children[i]; ++i )
		{
			if( !c.ui || !c.Enabled || !c.Visible ) continue;
			var name=c.ui.$Name;
			var l = c.__properties.X;
			var t = c.__properties.Y;
			var b = t + c.__properties.Height;
			var r = l + c.__properties.Width;
			if( evt.x >= l && evt.x <= r && evt.y >= t && evt.y <= b && !(pickZ>c.__properties.Z) )
			{
				pick = c;
				pickZ = c.__properties.Z;
			}
		}
		if( pick && this.screen[pick.ui.$Name + "_Touched"] ) this.screen[pick.ui.$Name + "_Touched"]({x:evt.x, y:evt.y});
		if( this.screen[this.$Name + "_Touched"] ) this.screen[this.$Name + "_Touched"]({x:evt.x, y:evt.y, touchedAnySprite:pick});
	},
	set$__dirty:function(d){
		if( this.__properties.__dirty == d ) return;
		this.__properties.__dirty = d;
		if( !d ) return;
		__dirtyCanvases.push(this);
		if( __dirtyCanvases.length == 1 )
			requestAnimationFrame(__redrawCanvases);
	},
	set$BackgroundImage:function(name){
		if( name == this.__properties.BackgroundImage ) return;
		this.__properties.BackgroundImage = name;
		var THIS = this;
		LIB.getFileBinary("assets/" + name, function(data){
			if( THIS.__properties.BackgroundImage != name ) return;
			var ext = name.match(/\.([a-zA-Z]+)$/) || [0, "png"];
			ext = ext[1];
			var fmt = "data:image/"+ext+";base64,"
			THIS.__image = new Image();
			THIS.__image.src = fmt + btoa(data);
		});
		return name;
	},
	set$BackgroundColor:function(c){
		var str;
		if( typeof c == "string" ) str = c.replace(/&H[0-9a-f]{2}([0-9a-f]{6})/i, "#$1");
		else if( c instanceof LIB.Color ) str = c.toRGBString();
		this.__properties.BackgroundColor = c;
		this.clearColor = str;
		return c;
	},
	set$PaintColor:function(c){
		this.__properties.PaintColor = c;
		this.ctx2d.strokeStyle = this.ctx2d.fillStyle = c.toRGBString();
		return c;
	},
    $resize:function(w, h){
    	if( !this.dom ) return;
    	this.dom.style.width = w + "px";
    	this.dom.style.height = h + "px";
    }
});

