defineComponent("File", "Component", function( ui ){
    this.SUPER(ui);
	var THIS = this;
    this.addMethod( "ReadFrom", function(name){
        if( name.indexOf("//") == 0 )
        {
        	LIB.getFile("assets"+name, function(text){
                if( THIS.screen[ui.$Name + "_GotText"] )
                    THIS.screen[ui.$Name + "_GotText"]({text:text});
        	});
        }
    });
});

defineComponent("Web", "Component", function( ui ){
	this.SUPER(ui);
	var THIS = this;
},{
get$Url:"",
Get:function(){
	var THIS = this;
	var bypass = document.location.href.match(/^https?:/i) != null;
	var url = this.Url;
	if(bypass) 
		url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from html where url="' + url + '"') + '&format=json';

	getURL( url, function(text, status){
		if( THIS.screen[THIS.ui.$Name + "_GotText"] && text )
		{
			if( bypass ) text = JSON.parse(text).query.results.body;
			THIS.screen[THIS.ui.$Name + "_GotText"]({ url:THIS.Url, responseCode:status, responseContent:text });
		}
	});
}
});