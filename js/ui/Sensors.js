defineComponent("Clock", "Component", function( ui ){
    var handle;
	var THIS = this;
    this.SUPER(ui);

    this.TimerInterval = ui.TimerInterval;
    this.TimerAlwaysFires = ui.TimerAlwaysFires == true;

    this.addMethod( "$resume", function(){
        if( handle ) return;
        handle = setInterval( tick, this.TimerInterval );
    });

    this.addMethod("$activate", this.$resume);

    this.addMethod( "$pause", function(){
        if( this.TimerAlwaysFires==true ) return;
        this.$stop();
    });

    this.addMethod( "$stop", function(){
        if( !handle ) return;
        clearInterval(handle);
        handle = null;
    });

    function tick(){
        if( THIS.screen[ui.$Name + "_Timer"] )
            THIS.screen[ui.$Name + "_Timer"]();
    }
},{
	get$TimerInterval:0,
	get$TimerAlwaysFires: false
});
