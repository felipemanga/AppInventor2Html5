defineComponent("Button", "Component", function( ui ){
	this.SUPER(ui, "button");
});

defineComponent("TextBox", "Component", function( ui ){
	this.SUPER(ui, ui.MultiLine=="True"?"textarea":"input");
}, {
	get$Width:150,
	onchange:function(com){
		if( com.ui.NumbersOnly )
			com.dom.value = com.dom.value.replace(/[^0-9.]+/g, "");
	},
	onkeyup:function(com){
		if( com.ui.NumbersOnly )
			com.dom.value = com.dom.value.replace(/[^0-9.]+/g, "");
	},
	get$NumbersOnly:false,
	get$MultiLine:false,
	get$Text:function(){
		return this.dom.value;
	},
	set$Text:function( t ){
		if( this.ui.NumbersOnly )
		{
			if( t === undefined ) t = "";
			else t = (""+t).replace(/[^0-9.]+/g, "");
		}
		this.set$Text.SUPER.call(this, t);
		this.dom.value = t;
	}
});

defineComponent("ListPicker", "Component", function(ui){
	this.SUPER(ui, "button");
},{
	get$BackgroundColor:"&HFF000000",
	get$TextSize:function(){ return this.FontSize; },
	set$TextSize:function(s){ return this.FontSize = s; },
	get$TextColor:"&HFFFFFFFF",
	get$Elements:[],
	set$Elements:function(e){
		this.__properties.Elements = e;
	},
	set$ElementsFromString:function(e){
		this.Elements = e.split(",");
	}
});

defineComponent("ListView", "Component", function( ui ){
	this.SUPER(ui, "div");
	if( !ui.TextSize ) this.TextSize = 22;
},{
	get$BackgroundColor:"&HFF000000",
	get$TextSize:function(){ return this.FontSize; },
	set$TextSize:function(s){ return this.FontSize = s; },
	get$TextColor:"&HFFFFFFFF",
	get$Elements:[],
	set$Elements:function(e){
		this.__properties.Elements = e;
		this.__update();
	},
	set$ElementsFromString:function(e){
		this.Elements = e.split(",");
	},
	__handle:null,
	__update:function(){
		if( !document.body.contains(this.dom) ) return;
		if( this.__handle ) clearTimeout( this.__handle );
		this.__handle = setTimeout( this.__update.bind(this), 500 );
		var e = this.__properties.Elements;
		while( this.dom.childNodes.length < e.length )
			DOC.create("div", {className:"ListViewItem"}, this.dom);
		while( this.dom.childNodes.length > e.length )
			this.dom.removeChild(this.dom.childNodes[this.dom.childNodes.length-1]);
		for( var i=0; i<e.length; ++i )
			this.dom.children[i].textContent = "" + e[i];
	},
	onclick:function(com, evt){
		var t = evt.target;
		while( t && t.parentNode != com.dom ) t=t.parentNode;
		if( !t ) return;
		com.SelectionIndex = Array.prototype.indexOf.call(com.dom.childNodes, t) + 1;
		com.Selection = t.textContent;
		if( com.screen[com.$Name + "_AfterPicking"] )
			com.screen[com.$Name + "_AfterPicking"]();
	}
});

defineComponent("Label", "Component", function( ui ){
	this.SUPER(ui, "div");
},{
	get$HasMargins:false
});

defineComponent("PasswordTextBox", "TextBox", function( ui ){
	this.SUPER(ui);
	this.dom.type = "password"
});


defineComponent("Image", "Component", function(ui){
	this.SUPER(ui, "img");
},{
	set$Picture:function(name){
		if( name == this.__properties.Picture ) return;
		this.__properties.Picture = name;
		var THIS = this;
		if( name.match(/^https?:\/\//i) )
		{
			THIS.dom.src = name;
		}
		else
		{
			LIB.getFileBinary("assets/" + name, function(data){
				if( THIS.__properties.Picture != name ) return;
				var ext = name.match(/\.([a-zA-Z]+)$/) || [0, "png"];
				ext = ext[1];
				var fmt = "data:image/"+ext+";base64,"
				THIS.dom.src = fmt + btoa(data);
			});
		}
		return name;
	},
	onload:function(com){
		if( com.ui.Height === undefined ) com.Height = com.dom.clientHeight;
		if( com.ui.Width === undefined ) com.Width = com.dom.clientWidth;
	}
});

defineComponent("WebViewer", "Component", function( ui ){
	this.SUPER(ui, "iframe");
},{
	set$HomeUrl:function(url){
		this.__properties.HomeUrl = url;
		this.dom.src = url;
	}
});

defineComponent("Spinner", "Component", function( ui ){
    this.SUPER(ui, "select");
    this.Elements = [];
});

defineComponent("Notifier", "Component", function( ui ){
	this.SUPER(ui);
	var THIS=this;

	function popup(title, text, btns, onClick){
		btns = btns || ["OK"];
		var buttons = [];
		for( var i=0; i<btns.length; ++i )
		{
			buttons.push(["button", {
				style:{margin:"5px"}, 
				text:btns[i], 
				onclick:onClick
			}]);
		}

		return DOC.create("div", {
			style:{
				position:"absolute", 
				top:0, 
				left:0, 
				width:"100%", 
				height:"100%", 
				backgroundColor:"rgba(0,0,0,0.3)",
				display:"flex",
				alignItems:"center"
			},
			children:[
				["div", {style:{width:"100%"}}],
				["div",{
					style:{width:"100%", backgroundColor:"#EEE"},
					children:[
						["div",{
							text:title,
							style:{
								backgroundColor:"#DDD",
								fontSize:"16px",
								fontWeight:"bold",
								padding:"5px"
								},
							display:"block"
						}],
						["div",{
							style:{ margin:"10px" },
							text:text
						}],
						["div",{
							style:{
								textAlign:"right"
							},
							children:buttons
						}]
					]
				}],
				["div", {style:{width:"100%"}}],
			]
		}, document.body);
	}

	this.__notification = {
		alert:function(title, msg, btn){
			var p = popup(title||AIA.properties.name, msg, btn||["OK"], function(){
				DOC.remove(p);
			});
			return p;
		},
		confirm:function(msg, cb, title, btns){
			var p = popup(title, msg, btns, function(e){
				DOC.remove(p);
				var v = THIS.screen[THIS.$Name + "_AfterChoosing" ];
				if( v ) v( e.target.textContent );
			});
			return p;
		}
	};
},{
	ShowAlert:function(msg){
		this.__notification.alert(null, msg);
	},
	LogError:function(msg){
		console.error(msg);
	},
	LogInfo:function(msg){
		console.log(msg);
	},
	LogWarning:function(msg){
		console.warn(msg);
	},
	ShowChooseDialog:function(msg, title, btn1, btn2, cancel){
		var THIS=this;
		var btns = [btn1, btn2];
		if( cancel && (""+cancel).toLowerCase() != "false" ) btns.push("Cancel");
		this.__notification.confirm(msg, function(v){
			var c = THIS.screen[THIS.$Name + "_AfterChoosing"];
			if( c ) c(v)
		}, title, btns);
	},
	ShowMessageDialog:function(msg, title, btn)
	{
		this.__notification.alert(title, msg, [btn]);
	},
	ShowProgressDialog:function(msg, title){
		this.__progressDialog = this.__notification.alert(title||"Please wait", msg||"Please wait", []);
	},
	DismissProgressDialog:function(){
		DOC.remove(this.__progressDialog);
		this.__progressDialog = null;
	}
},{
	plugins:{
		'org.apache.cordova.dialogs':1,
		'org.apache.cordova.vibration':1
	}
});