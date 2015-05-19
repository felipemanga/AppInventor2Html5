var _zipFilePath = document.currentScript.textContent;

var LIB = {

lists_to_csv_row: function( list ){
	if( !Array.isArray(list) ) return "";
	return '"' + list.map(function(i){return i.replace(/"/g, '""');}).join('","') + '"';
},

lists_from_csv_table: function( table ){
	return CSV.parse(table);
},

lists_create_with: function(){
	return Array.prototype.slice.call(arguments);
},

lists_add_items: function(list){
	list.push.apply( list, Array.prototype.slice.call(arguments, 1) );
},

getImageFromZip:function(name)
{
	if( name in LIB.getImageFromZip.cache )
		return LIB.getImageFromZip.cache[name].cloneNode();
	var img = new Image(LIB.getFile("assets/"+name));
	LIB.getImageFromZip.cache[name] = img;
	return img;
},

Color: function(list)
{
	this.r = list[0];
	this.g = list[1];
	this.b = list[2];
	this.addMethod( "toRGBString", function(){
		return "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
	});
},

random: function( f, t )
{
	return Math.round(Math.random()*(t-f)+f);
},

getFile: function( path, cb )
{
	path = LIB.normalizePath(path);
	if( !AIA.zip ) getURL(path, cb);
	else
	{
		var ret = AIA.zip.file(path);
		if( ret ) ret = ret.asText();
		if( cb ) cb( ret );
	}
	return ret;
},

getFileBinary: function( path, cb )
{
	var np = LIB.normalizePath(path);
	if( !AIA.zip )
	{
		getURL( path, cb, {binary:true});
	}
	else
	{
		var f = AIA.zip.file(np);
		if( !f )
		{
			console.error("Could not open file " + path);
			return null;
		}
		if( f ) f=f.asBinary();
		if( cb ) cb( f );
	}
	return f;
},

normalizePath: function( path )
{
	return path.replace(/[^\/]*\/\.\.\//g, "").replace(/\/\.\//g, "/").replace(/\/+/g, "/");
}


};

window.AIA = {
	zip:null,
	properties:{},
	bky:{},
	scm:{},
    packagePath: function( pack )
    {
        return LIB.normalizePath("youngandroidproject/" + this.properties.source + "/" + pack.replace(/\./g, '/') );
    },
    parseBKY: function ( src )
    {
		if( AIA.bky[src] ) return AIA.bky[src];
        return xmlToJS((new DOMParser()).parseFromString( LIB.getFile(src),"text/xml"));
    },
	parseSCM: function( path )
	{
		if( AIA.scm[path] ) return AIA.scm[path];
		return JSON.parse( (LIB.getFile( path ) || "{\"Properties\":{\"$Type\":\"Form\"}}").replace(/^#\|\s*\$JSON\s*(.*)\s*\|#$/, "$1") );
	}
};

AIA.load = function( path, data, cb ){
	path = path || _zipFilePath;
	if( !path && !data )
		return;
		
	function loadData(){
		AIA.zip = new JSZip(data);
		var propList = LIB.getFile("youngandroidproject/project.properties").split("\n");
		for( var i=0, prop; prop=propList[i]; ++i )
		{
			prop = prop.split("=");
			AIA.properties[ prop[0].trim() ] = prop[1].trim();
		}

		AIA[cb]();
	}

	if( !data && path )
	{
		JSZipUtils.getBinaryContent( path, function(err, _data) {
			if(err) {
				alert(err);
				return;
			}
			data = _data;
			loadData();
		});
	}
	else if( data ) loadData();
};

AIA.exportZip = function(){
	var pending = 1;
	var ozip = new JSZip();
	var html = "<html><head>";
	var includes = [];
	var styles = [];
	var aiainfo = "";
	for( var i=0; i<document.head.children.length; ++i )
	{
		var tag = document.head.children[i];
		if( tag.tagName == "SCRIPT" && tag.src )
		{
			pending++;
			getURL(tag.src, (function(i){ return function(s){
				includes[i] = s;
				done();
			}; })(i));
		}
		if( tag.tagName == "STYLE" )
			styles.push(tag.textContent);
	}

	aiainfo = "AIA.properties = " + JSON.stringify(AIA.properties) + ";\n";

	for( var f in AIA.zip.files )
	{
		if( /^assets\/.*$/i.test(f) )
		{
			ozip.file(f, AIA.zip.file(f).asBinary(), {binary: true});
		}else if( /^src\/.*\.bky$/i.test(f) )
		{
			aiainfo += "AIA.bky['" + f + "'] = function($SCREEN){\n" + AIA.parseBKY(f) + "\n};\n";
		}else if( /^src\/.*\.scm$/i.test(f) )
		{
			aiainfo += "AIA.scm['" + f + "'] = " + JSON.stringify(AIA.parseSCM(f)) + ";\n";
		}
	}

	function done(){
		pending--;
		if( pending ) return;
		includes.push(aiainfo);
		html += "<style>" + styles.join("\n\n") + "<" + "/style>";
		html += "<" + "script>" + includes.join("\n\n") + "<"+"/script>";
		html += "<" + "/head><" + "body onload=\"AIA.start()\"><" + "/body><" + "/html>";
		ozip.file("index.html", html);

		var zipstr = ozip.generate({type:"blob"});
		var link = DOC.create("a", document.body, {
			href:URL.createObjectURL(zipstr),
			download:AIA.properties.name + ".zip",
			text:"[Click to save]"
		});

		var event = document.createEvent("MouseEvents");
		event.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		// link.dispatchEvent(event);

		DOC.create("div", {text: html}, document.body);
	}

	done();
};

AIA.start = function()
{
	var screenStack = [];
	var currentScreen = null;

	window.addEventListener("resize", function(){
		if( window.ActiveScreen )
			window.ActiveScreen.$resize();
	});

    function openScreen( classPath, startValue )
    {
    	if( classPath.indexOf("appinventor.") != 0 )
    		classPath = AIA.properties.main.replace(/\.[^.]+$/, "." + classPath);

        var path = AIA.packagePath(classPath);
        var bky = AIA.parseBKY( path + ".bky" )
		var ui =  AIA.parseSCM( path + ".scm" )
		var screen = new Screen( bky, renderUI(ui) );
		if( currentScreen )
		{
			screenStack.push( currentScreen );
			currentScreen.$pause();
		}
		currentScreen = screen;
		window.ActiveScreen = currentScreen;
		screen.$activate( startValue );
    }
    window.openAnotherScreen = openScreen;

    function closeScreen( returnValue )
    {
    	var name = currentScreen.__root.$Name;
    	currentScreen.$stop();
    	currentScreen = screenStack.pop();
    	currentScreen.$activate( returnValue, name );
    }
	window.closeScreen = closeScreen;

    function Screen( src, root )
    {
		this.components = root.index;
		this.__root = root;
		var THIS = this;

    	function propagate(event)
    	{
			for( var k in root.index )
			{
				root.index[k].screen = THIS;
				if( root.index[k][event] )
					root.index[k][event]();
			}
    	}

		this.addMethod( "$pause", function(){
			if( root.dom.parentNode )
				root.dom.parentNode.removeChild( root.dom );
			propagate("$stop");
		});

		this.addMethod( "$stop", function(){
			document.body.removeChild(root.dom);
			propagate("$stop");
		});

		this.addMethod( "$activate", function( startValue, otherScreenName ){
			document.body.appendChild(root.dom);
			propagate("$activate");
			this.$resize();
			if( !otherScreenName )
			{
				this.__StartValue = startValue;
				if( this[root.dom.id + "_Initialize"] )
					this[root.dom.id + "_Initialize"]();
			}
			else
			{
				if( this[root.dom.id + "_OtherScreenClosed"] )
					this[root.dom.id + "_OtherScreenClosed"]({result:startValue, otherScreenName:otherScreenName});
			}
		});

		this.addMethod( "$resize", function(){
			if( root.$resize ) root.$resize(window.innerWidth, window.innerHeight);
			if( this[root.dom.id + "_ScreenOrientationChanged"] )
				this[root.dom.id + "_ScreenOrientationChanged"]();
		})
		if( typeof src == "string" )
		{
			window.$SCREEN = this;
			document.head.appendChild(DOC.create('script', {text:src}));
		}else{
			src.call(this, this);
		}
    }
	DOC.create("title", {text:AIA.properties.name}, document.head);
	openScreen(AIA.properties.main);
}