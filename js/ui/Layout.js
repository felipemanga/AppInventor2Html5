defineComponent("HorizontalArrangement", "ComponentContainer", function( ui ){
    this.SUPER( ui, "div" );
});

defineComponent("VerticalArrangement", "ComponentContainer", function( ui ){
    this.SUPER( ui, "div" );
});

defineComponent("TableArrangement", "ComponentContainer", function( ui ){
	var grid = [];
	var x, y;
	for( y=0; y<ui.Rows; y++ )
	{
		grid.push({$Type:"HorizontalArrangement", $Components:[]});
	}
	
	var coms = ui.$Components;
	for( var i=0; i<coms.length; ++i )
	{
		var com = coms[i];
		grid[com.Row].$Components[com.Column] = com;
		delete com.Column;
		delete com.Row;
	}

	ui.$Components = grid;
    this.SUPER( ui, "div" );

},{
	get$Columns:0,
	get$Rows:0
});

defineComponent("Form", "VerticalArrangement", function Form( ui ){
    this.SUPER( ui, "div" );
},{
	set$Title: function(t){ this.__properties.Title = t; document.title = t; },
	set$AboutScreen: function(t){ this.__properties.AboutScreen = t; console.log(t); },
	set$AppName:null,
	set$ScreenOrientation:null
});

