defineComponent("Clock", "Component", function( ui ){
    var handle;
	var THIS = this;

    this.addMethod( "$resume", function(){
        if( handle || !THIS.TimerEnabled ) return;
        handle = setInterval( tick, this.TimerInterval );
    });

    this.addMethod("$activate", this.$resume);

    this.addMethod( "$pause", function(){
        if( this.TimerAlwaysFires===true || (typeof this.TimerAlwaysFires == "string" && this.TimerAlwaysFires.toLowerCase() == "true") ) return;
        this.$stop();
    });

    this.addMethod( "$stop", function(){
        if( !handle ) return;
        clearInterval(handle);
        handle = null;
    });

    this.SUPER(ui);
    
    function tick(){
        if( THIS.TimerEnabled && THIS.screen[ui.$Name + "_Timer"] )
            THIS.screen[ui.$Name + "_Timer"]();
    }
},{
	get$TimerInterval:1000,
	get$TimerAlwaysFires: false,
	get$TimerEnabled:true,
	set$TimerEnabled:function(v){
		this.__properties.TimerEnabled = v;
		if( v && typeof v == "string" ) v = v.toLowerCase() != "false";
		if( v ) this.$resume();
		else this.$stop();
	}
});
