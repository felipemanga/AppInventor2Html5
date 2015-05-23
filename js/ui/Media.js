(function(){

var soundCache = {};

defineComponent("Sound", "Component", function( ui ){
	this.SUPER(ui);
},{
	set$Source:function(file){
	    if( file == this.__properties.Source ) return;
        if( this.__sound ) this.Stop();
        this.__properties.Source = file;
        this.__sound = soundCache[file];
        if( this.__sound ) return;
        var THIS = this;
        LIB.getFileBinary("assets/" + file, function(data){
			var ext = name.match(/\.([a-zA-Z]+)$/) || [0, "mp3"];
			ext = ext[1].toLowerCase();
			// if( ext == "mp3" ) ext = "mpeg";
			var fmt = "data:audio/"+ext+";base64,"
			data = fmt + btoa(data);
			if( window.Media ) data = new window.Media(data);
			else if( window.Audio )
			{
			    var src = data;
                data = new Audio(src);
                //data.src = src;
			}
            soundCache[file] = data;
    	    if( file != THIS.__properties.Source ) return;
    	    THIS.__sound = data;
        });
	},
	Play:function(){
	    if( !this.__sound ) return;
	    this.__sound.currentTime = 0;
        this.__sound.play();
	},
	Resume:function(){
	    if( !this.__sound ) return;
        this.__sound.play();
	},
	Stop:function(){
	    if( !this.__sound ) return;
	    this.__sound.pause();
	    this.__sound.currentTime = 0;
	},
	Pause:function(){
	    if( !this.__sound ) return;
	    this.__sound.pause();
    }
},{
	plugins:{
		"org.apache.cordova.media":1
	}
});

})();
