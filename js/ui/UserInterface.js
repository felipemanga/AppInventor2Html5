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

defineComponent("ListPicker", "Component", function( ui ){
	this.SUPER(ui, "button");
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
		LIB.getFileBinary("assets/" + name, function(data){
			if( THIS.__properties.Picture != name ) return;
			var ext = name.match(/\.([a-zA-Z]+)$/) || [0, "png"];
			ext = ext[1];
			var fmt = "data:image/"+ext+";base64,"
			THIS.dom.src = fmt + btoa(data);
		});
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
