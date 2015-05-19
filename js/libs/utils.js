var UTIL = {
	mergeToEx : function( r, a )
	{
		for( var i=0; i<a.length; ++i )
		{
			var o=a[i];
			for( var k in o )
				r[k] = o[k];
		}
		return r;
	},
	mergeTo : function( r )
	{
		return UTIL.mergeToEx( r, Array.prototype.slice.call(arguments, 1) );
	},
	merge : function()
	{
		return UTIL.mergeToEx({}, arguments);
	},
	
	escapeHTML: function(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},
	
	__uid:0,
	getUID:function(){
		return UTIL.__uid++;
	},
	
	typeOf:function(o, t){
		var r = Array.isArray(o) ? "array" : typeof o;
		if( r == "object" )
		{
			for( var i=1, T; T=arguments[i]; ++i )
				if( o instanceof T ) return T.name;
		}
		return r;
	},
	
	makeInto:function(r, t)
	{
		if( !t || r == t ) return r;
		
		for( var k in t )
		{
			var v = t[k];
			var val = v;
			var type = UTIL.typeOf(val);
			var ct = type=="object";
			if( v && type == "object" && "value" in v )
			{
				val  = v.value;
				type = v.type || typeof val;
				ct = false;
			}
			
			if( r.hasOwnProperty(k) )
			{
				var cv = r[k];
				var typeofcv = UTIL.typeOf(cv);
				
				if( ct )
				{
					UTIL.makeInto(cv, val); 
				}
				else if( type != typeofcv )
				{
					switch( type )
					{
					case "number": cv=parseFloat(cv); continue;
					case "int": cv=parseInt(cv); continue;
					case "boolean": cv=(typeofcv == "string" && cv=="true") || (typeofcv != "string" && !!cv); continue;
					case "array": cv = val.map(UTIL.make);
					default: cv=val; continue;
					}
					r[k] = cv;
				}
			}
			else
			{
				if( type == "function" ) r.addMethod(k, v);
				else if( ct ) r[k] = UTIL.makeInto({}, val);
				else if( type == "array" ) r[k] = val.map(UTIL.make);
				else r[k] = val;
			}
		}
		
		if( typeof r.init == "function" )
			r.init.apply( r, Array.prototype.slice.call(arguments, 2) );
		
		return r;
	},
	
	make:function(t)
	{
		return UTIL.makeInto.apply(
			UTIL, 
			[{}, t].concat(Array.prototype.slice.call(arguments)) 
			);
	}
};

Object.defineProperties(Array.prototype, {
RLEncode:{
	value:
	function RLEnc(){
	var out = [];
	for( var i=0; i<this.length; ++i )
	{
		var c = this[i];
		var j;
		for( j=i+1; j<this.length && this[j]==c; ++j );
		if( j>i+2 ) 
		{
			out.push( i-j, c );
			i = j-1;
		}
		else out.push( c );
	}
	return out;
}},
RLDecode:{
	value:
	function RLDec(){
		var out = [];
		for( var i=0; i<this.length; ++i )
		{
			var c = this[i];
			var j;
			if( c<0 )
			{
				j = c;
				c = this[++i];
				while(j++) out.push(c);
			}else out.push(c);
		}
		return out;
	}
}});


function serialize( data )
{
    var tod = typeof data;
    if( data === null 
        || data === undefined
        || tod == "string" 
        || tod == "number"
        || tod == "boolean"
        ) return data;
    var ctor = data.constructor.fullName || data.constructor.name;
    if( typeof data.serialize == "function" ) return { ctor:ctor, args:data.serialize() };
    if( typeof data.toJSON == "function" ) return { ctor: ctor, args: [data.toJSON()] };
    var ret;
    if( data instanceof Array )
    {
        ret = [];
        for( var i=0; i<data.length; ++i )
            ret.push( serialize(data[i]) );
    }
    else
    {
        ret = { ctor: ctor, data:{} };
        for( var k in data )
            ret.data[k] = serialize(data[k]);
    }
    return ret;
}

function unserialize( data )
{
    var tod = typeof data;
    if( data === null 
        || data === undefined
        || tod == "string" 
        || tod == "number"
        || tod == "boolean"
        ) return data;
    var ret;
    if( data instanceof Array )
    {
        ret = [];
        for( var i=0; i<data.length; ++i )
            ret.push( unserialize(data[i]) );
    }
    else
    {
        var ctor = resolve(data.ctor);
        if( !ctor )
        {
            console.error("Constructor '" + data.ctor + "' could not be found.");
            return undefined;
        }
        
        if( data.args )
        {
            if( ctor.unserialize && ctor.unserialize instanceof Function )
                return ctor.unserialize.apply( ctor, data.args );
            return newApply(ctor, data.args);
        }
        ret = new ctor;
        for( var k in data.data )
            ret[k] = unserialize(data.data[k]);
    }
    return ret;
}

function Pool()
{
    var methods = { constructor:[] };
    var silence = {"onTick":1, "onRender":1};
    var debug = null;
	
	this.debug = function(m){
		debug = m;
	};
	
    this.silence = function(m){
        silence[m] = 1;
    };
    
    this.add = function(obj)
    {
        if( !obj ) return;
		if( obj.constructor.name == debug )
			console.log("add", obj);
		
        if( obj.__methods && obj.__methods.length )
        {
            var l = obj.__methods.length;
            for( var i=0; i<l; ++i )
            {
                var m = obj.__methods[i];
                this.listen( m.name, m.func );
            }
        }
        else
        {
            for( var k in obj )
            {
                if( typeof obj[k] != "function" ) continue;
                obj[k].THIS = obj;
                this.listen( k, obj[k] );
            }
        }
    };
    
    this.remove = function(obj)
    {
		if( obj.constructor.name == debug )
			console.log("remove", obj);
		
        if( obj.__methods && obj.__methods.length )
        {
            var l = obj.__methods.length;
            for( var i=0; i<l; ++i )
            {
                var m = obj.__methods[i];
				this.mute(m.name, m.func);
            }
        }
        else
        {
			for( var k in obj )
				this.mute(k, obj[k]);
        }
    };
    
    this.listen = function( name, method )
    {
        if( typeof method != "function" ) return;
        
        var arr = methods[name];
        if( !arr ) arr = methods[name] = [];
        arr.push( method );
    };
    
    this.mute = function( name, method )
    {
        var arr = methods[name];
        if( !arr ) return;
        if( !arr.indexOf )
            console.log("eh?!");
        var i = arr.indexOf(method);
        if( i == -1 ) return;
        arr.splice( i, 1 );
    };
    
    this.call = function( method )
    {
		if( method === undefined )
		{
			console.error("Undefined call");
			return;
		}
        var arr = methods[method];
        if( !arr ) 
        {
            if( !(method in silence) ) console.log(method + ": 0");
            return;
        }
		arr = arr.slice();
        var args = Array.prototype.slice.call(arguments, 1);
        var ret = undefined;
        if( !(method in silence) ) console.log(method + ": " + arr.length);
        for( var i=0, c; c=arr[i]; ++i )
        {
			// DEBUG
			if( method == debug || c.constructor.name == debug ) 
				console.log(c.THIS, c.name, args);
			// END-DEBUG
			
            var lret = c.apply( c.THIS, args );
            if( lret !== undefined ) ret = lret;
        }
        return ret;
    };
}

window.pool = new Pool();
window.$$ = window.pool.call;

function newFlagManager(obj, onDirtyCB)
{
    function ret(key){
        if( arguments.length == 1 ) return resolve(key, ret.obj);
        resolve(key, ret.obj, arguments[1]);
        if( onDirtyCB ) onDirtyCB();
        return arguments[1];
    }
    ret.obj = obj;
    ret.init = function( key, def )
    {
        var r = resolve(key, ret.obj);
        if( r === undefined ) 
        {
            resolve( key, ret.obj, r=def );
            if( onDirtyCB ) onDirtyCB();
        }
        return r;
    };
    
    return ret;
}

function resolve(strpath, octx, writeValue, returnHandle)
{
    octx = octx || window;
    var ctx = octx;
    var path = strpath instanceof Array ? strpath : strpath.split(".");

    if( writeValue === undefined )
    {
        for( var i=0; i<path.length && ctx; ++i )
            ctx=ctx[path[i]];
            
        if( i<path.length && octx.parentCTX )
            ctx = resolve( path, octx.parentCTX );
    }
    else
    {
        for( var i=0; i<path.length-1; ++i )
        {
            if( !(path[i] in ctx) ) ctx[path[i]] = {};
            ctx=ctx[path[i]];
        }
        if( returnHandle ) ctx = { obj:ctx, key:path[i], value:ctx[path[i]] };
        else return ctx[path[i]] = writeValue;
    }
        
    return ctx;
}

function postURL( url, data, cb )
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function()
    {
        if( xhr.readyState == 4 && ( xhr.status == 200 || xhr.status === 0 ) )
            cb( xhr.response || xhr.responseText );
    };
    xhr.send(JSON.stringify(data));
}

function getURL( url, cb, cfg )
{
    var xhr = new XMLHttpRequest();
    cfg = cfg || {};
	if( cfg.binary ) xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function()
    {
        if( xhr.readyState == 4 && ( xhr.status == 200 || xhr.status === 0 ) )
        {
       		var v = xhr.response || xhr.responseText;
        	if( cfg.binary )
        	{
        		var r = '';
        		for( var i = 0; i<v.length; ++i )
        		{
        			cc = v.charCodeAt(i);
        			r += String.fromCharCode(cc & 0xFF);
        		}
        		v=r;
        	}
            cb( v,xhr.status );
        }
    };
    xhr.send();
}

function newApply(clazz, args) {
    return new (clazz.bind.apply(clazz, [null].concat(args)));
}
(function(){
var superStack = {};
Object.defineProperty(Object.prototype, "SUPER", {
	writable: true,
	value: function()
	{
		var uid;
		if( !("__uid" in this) )
			Object.defineProperty(this, "__uid", {value:UTIL.getUID()});
		uid = this.__uid;
		var t = this;
		if( superStack[uid] )
		{
			for( var l = 0; t && l < superStack[uid]; ++l )
				t = t.constructor.prototype || Object.getPrototypeOf(t.constructor);
		}else superStack[uid] = 0;

		if( !t )
			return;

		superStack[uid]++;
		var ctor = t.constructor;
		
		if( ctor && ctor != Object )
			ctor.apply(this, Array.prototype.slice.call(arguments) );
		superStack[uid]--;
		if( !superStack[uid] )
			delete superStack[uid];
	}
});
})();
Object.defineProperty(Object.prototype, "addProperty", {
	value: function( name, init, _g, _s )
	{
		var properties = this.__properties;
		if( !properties )
		{
			properties = {};
			Object.defineProperty(this, "__properties", {enumerable:false, value:properties} );
		}
		properties[name] = init;

		Object.defineProperty(this, name, {
		get:_g,
		set:_s
		});
	}
});
Object.defineProperty(Object.prototype, "addMethod", {
    value: function( name, func )
    {
		if( typeof name == "function" )
		{
			func = name;
			name = func.name;
		}
		
        var methods = this.__methods;
        if( !methods )
        {
            methods = [];
            Object.defineProperty(this, "__methods", {
                enumerable: false,
                value: methods
            });
        }
    
        Object.defineProperty(this, name, {
            enumerable: false,
            writable: false,
            value: func
        });
        
        methods.push({name:name, func:func});
        
        func.THIS = this;
    }
});



var DOC = {
	getTextWidth: function(text, font) {
		// re-use canvas object for better performance
		var canvas = DOC.getTextWidth.canvas || (DOC.getTextWidth.canvas = document.createElement("canvas"));
		var context = canvas.getContext("2d");
		context.font = font || "12px arial";
		var metrics = context.measureText(text);
		return metrics.width;
	},
	
	create : function()
	{
		var tag;
		var prop = {};
		var children;
		var parent;
		for( var i=0; i<arguments.length; ++i )
		{
			var arg=arguments[i];
			var type = UTIL.typeOf(arg, Element);
			switch( type )
			{
			case "string": tag = arg; break;
			case "object": UTIL.mergeTo(prop, arg); break;
			case "array":  children = arg; break;
			case "Element": parent = arg; break;
			}
		}
		
		parent = parent || prop.parent;

		tag = tag
			|| prop.tag
			|| {
				"select":"option",
				"ul":"li",
				"ol":"li",
				"table":"tr",
				"tr":"td",
				}[prop.parentTag] 
			|| "span";

		children = children || [];
		if( "children" in prop )
			children = children.concat( prop.children );
		
		var el = document.createElement(tag);
		var f = {
			tag:function(){},
			style:UTIL.mergeTo.bind(UTIL, el.style),
			children:function(){},
			attr:function(a){
				for( k in a ) el.setAttribute(k, a[k]);
				},
			html:function(s){ el.innerHTML = s; },
			text:function(s){ el.textContent = s; }
		};
		
		for( i in prop )
		{
			if( i in f ) f[i](prop[i]);
			else el[i] = prop[i];
		}
		
		var before = prop.before;
		if( before )
		{
			if( typeof before == "string" ) before=DOC.qs(before) || DOC.byId(before);
			if( before && before.parentElement ) parent = before.parentElement;
		}
		
		if( parent )
		{
			if( typeof parent == "string" ) parent=DOC.qs(parent) || DOC.byId(parent);
			parent.insertBefore(el, before);
		}			
		
		for( var k=0, v; v=children[k]; ++k )
		{
			type = UTIL.typeOf(v, Element);
			switch( type ){
			case "Element": break;
			case "string": v={html:v};
			case "object": v=[v];
			case "array":
				v=DOC.create.apply(DOC, v.concat({parentTag:tag}));
				break;
			default: 
				console.error(type);
				break;
			}
			
			if( !v.parentNode ) 
				el.appendChild( v );
		}
		
		return el;
	},
		
	byId : function(id){ return document.getElementById(id); },
	
	qs : function(q){ return document.querySelector(q); },
	
	index: function( root, obj )
	{
		obj = obj || {};
		root = root || document.body;
		for( var i=0, c; c=root.children[i]; ++i )
		{
			if( c.id ) obj[ c.id ] = c;
			if( c.className ) obj[ c.className ] = c;
			if( c.name ) obj[ c.name ] = c;
			DOC.index( c, obj );
		}
		return obj;
	},
	
	removeChildren:function(e)
	{
		while(e.lastChild) e.removeChild(e.lastChild);
		return e;
	},

	getStyle: function(e, rule){
		var strValue = "";
		if(document.defaultView && document.defaultView.getComputedStyle){
			strValue = document.defaultView.getComputedStyle(e, "").getPropertyValue(rule);
		}
		else if(e.currentStyle){
			rule = rule.replace(/\-(\w)/g, function (strMatch, p1){
				return p1.toUpperCase();
			});
			strValue = e.currentStyle[rule];
		}
		return strValue;
	}
};

