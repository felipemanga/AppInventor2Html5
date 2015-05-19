/*
The MIT License (MIT)

Copyright (c) 2015 Felipe Manga

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

https://github.com/felipemanga/AppInventor2Html5.git

function xmlToJS( xml )
{
    function indexChildren( parent )
    {
        var ret = {};
        for( var i=0; i<parent.childNodes.length; ++i )
        {
            var c=parent.childNodes[i];
            if( c.nodeType == c.TEXT_NODE ) continue;
            if( !ret[ c.tagName ] ) ret[ c.tagName ] = [c];
            else ret[ c.tagName ].push(c);
            for( var j=0; j<c.attributes.length; ++j )
            {
                var attr = c.attributes[j].name;
                if( !ret[ "$" + attr ] ) ret[ "$" + attr ] = {};
                ret[ "$" + attr ][ c.attributes[j].value ] = c;
            }
        }
        return ret;
    }

    function translate(cxml, index)
    {
        var type = cxml.getAttribute("type") || cxml.tagName;
		if( cxml.getAttribute("disabled") == "true" )
		  return "";
        var ctor = blocks[ type ];
        var ret = "";
        if( !ctor ) console.log("Unknown code block: ", cxml);
        else
        { 
            try{
                ret = ctor( cxml, index );
            }catch(e){
                ret = "";
                console.error( "Error translating block! ", cxml, e.stack );
            }
        }
        if( ret === undefined )
        {
            console.log(cxml);
            console.error("Undefined return");
        }
        return ret;
    }

    function iterate(p){
        var src = "";
		for( var cid=0; cid<p.childNodes.length; ++cid )
		{
			var cxml = p.childNodes[cid];
			if( cxml.nodeType == cxml.TEXT_NODE ) continue;
			var ic = indexChildren(cxml);
			src += translate(cxml, ic);
			if( ic.next ) 
				src += iterate( ic.next[0] );
		}
        return src;
    }

    function lib( terminate, xml, index )
    {
        if( !isInFunc ) return "";
        var args = [];
        if( index.value )
            for( var i=0; i<index.value.length; ++i )
                args.push( iterate( index.value[i] ) );

        var ret = "LIB" + deref( xml.getAttribute("type") ) + "( " + args.join(", ") + " )";
        if( terminate ) ret = "\t" + ret + ";\n";
        return ret;
    }

    function math( xml, index )
    {
        if( !isInFunc ) return "";
        var f = index.$name.OP.textContent.toLowerCase();
        if( !(f in Math) )
        {
            console.error(f);
        }
        var param = "(" + iterate(index.$name.NUM) + ")";
        if( f == "sin" || f == "cos" || f == "tan" )
            param = "(" + param + " / 180 * 3.14159265 )";
        return "Math." + f + param;
    }

    function mathOp( op, xml, index ){
        if( !isInFunc ) return "";
        var args = [];
        if( !op )
        {
            op = {GT:">", LT:"<", GTE:">=", LTE:"<=", NEQ:"!=", EQ:"==", EQUAL:"==", AND:"&&", OR:"||", MODULO:"%"}[ index.$name.OP.textContent ];
            if( !op )
            {
                console.error("Unknown op!", index.$name.OP.textContent);
            }
        }
        if( index.value )
            for( var i=0; i<index.value.length; ++i )
                args.push( iterate( index.value[i] ) );
        var cast = " ";
        if( op == "+" ) cast=" Number";
        return cast + "(" + args.join(") " + op + cast + "(") + ")";
    }

    function safeName(n)
    {
        return n.replace(/[^a-zA-Z0-9]/g, "_");
    }

    function deref(n)
    {
        if( n.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/) ) return "." + n;
        return "['" + n.replace(/(['\\])/g, "\\$1") + "']";
    }

    var stack = [];
    var usid = 0;

    function local(name, id)
    {
        return "_" + (id||usid) + name;
    }

    var isInFunc = false;

    var blocks = {
        component_event: function( xml, index ){
            if( !index.statement ) 
                return "";

            var instance_name = index.mutation[0].getAttribute("instance_name");
            var event_name = index.mutation[0].getAttribute("event_name");
            var src = 'this.addMethod("' + instance_name + "_" + event_name + '", function(ctx){\n';
            isInFunc = true;
            src += iterate( index.statement[0] );
            isInFunc = false;
            src +='});\n\n';
            return src;
        },

        component_component_block: function( xml, index )
        {
            if( !isInFunc ) return "";
            return "$COM" + deref(index.$name.COMPONENT_SELECTOR.textContent);
        },

        component_set_get: function( xml, index ){
            if( !isInFunc ) return "";
            var instance_name = index.mutation[0].getAttribute("instance_name");
            var sog = index.mutation[0].getAttribute("set_or_get");
            var ret = "";
            if( instance_name ) ret += "$COM" + deref( instance_name );
            else 
                ret += iterate( index.$name.COMPONENT );
            ret += deref( index.$name.PROP.textContent );
            if( sog == "set" ) ret = "\t" + ret + " = " + iterate(index.$name.VALUE) + ";\n";
            return ret;
        },

        component_method: function( xml, index )
        {
            if( !isInFunc ) return "";
            var funcName = index.mutation[0].getAttribute("method_name");
            var src = '\t';
            var instance_name = index.mutation[0].getAttribute("instance_name");
            if( instance_name ) src += '$COM' + deref(instance_name)
            else 
                src += iterate(index.$name.COMPONENT);
            src += deref(funcName) + '( ';
               
            for( var argNum=0; index.$name["ARG" + argNum]; ++argNum )
            {
                if( argNum ) src += ",";
                src += iterate( index.$name["ARG" + argNum] );
            }
            src += " );\n";
            return src;
        },

        procedures_callnoreturn: function( xml, index )
        {
            if( !isInFunc ) return "";
            var funcName = index.$name.PROCNAME.textContent;
            var mutIndex = indexChildren( index.$name[funcName] );
            var src = '\t' + safeName(funcName) + '(';
            var param = '';
            for( var argNum=0; index.$name["ARG" + argNum]; ++argNum )
            {
                if( argNum ) param += ",";
                // param += "\n\t\t'" + mutIndex.arg[argNum].getAttribute("name") + "': ";
                param += iterate( index.$name["ARG" + argNum] );
            }
            // if( param != '' ) param='{' + param + '\n\t}';
            src += param + ");\n";
            return src;
        },

        procedures_callreturn: function( xml, index )
        {
            if( !isInFunc ) return "";
            var funcName = index.$name.PROCNAME.textContent;
            var mutIndex = indexChildren( index.$name[funcName] );
            var src = safeName(funcName) + '(';
            var param = '';
            for( var argNum=0; index.$name["ARG" + argNum]; ++argNum )
            {
                if( argNum ) param += ",";
                // param += "\n\t\t'" + mutIndex.arg[argNum].getAttribute("name") + "': ";
                param += iterate( index.$name["ARG" + argNum] );
            }
            // if( param != '' ) param='{' + param + '\n\t}';
            src += param + ")";
            return src;
        },

        procedures_defnoreturn: function( xml, index )
        {
            ++usid;
            var ctx = {};

            var name = index.$name.NAME.textContent;
            var src = 'function ' + safeName(name) + '( ';
            for( var i=0; index.$name['VAR'+i]; ++i )
            {
                if( i ) src += ', ';
                var pname = index.$name['VAR'+i].textContent;
                src += '_' + usid + safeName(pname);
                ctx[pname] = usid;
            }
            src += ' ){\n';
            stack.push(ctx);
            isInFunc = true;
            if( index.statement && index.statement[0] )
                src += iterate( index.statement[0] );
            isInFunc = false;
            stack.pop();
            // src += '\tconsole.log("PROC: '+ name + '", ctx);\n';
            src +='};\n\n';
            return src;
        },

        procedures_defreturn: function( xml, index )
        {
            ++usid;
            var ctx = {};

            var name = index.$name.NAME.textContent;
            var src = 'function ' + safeName(name) + '( ';
            for( var i=0; index.$name['VAR'+i]; ++i )
            {
                if( i ) src += ', ';
                var pname = index.$name['VAR'+i].textContent;
                src += '_' + usid + safeName(pname);
                ctx[pname] = usid;
            }
            src += ' ){\n';
            stack.push(ctx);
            isInFunc = true;
            src += "\treturn " + iterate( index.value[0] ) + ";\n";
            isInFunc = false;
            stack.pop();
            src +='};\n\n';
            return src;
        },        

        global_declaration: function( xml, index )
        {
            var ret = "var $global_" + safeName(index.$name.NAME.textContent);
            isInFunc = true;
            if( index.$name.VALUE )
                ret += " = " + iterate(index.$name.VALUE) + ";\n";
            else
                ret += ";\n";
            isInFunc = false;
            return ret;
        },

        controls_getStartValue:function( xml, index )
        {
            if( !isInFunc ) return "";
            return "$SCREEN.__StartValue";
        },

        controls_closeScreenWithValue: function( xml, index )
        {
            if( !isInFunc ) return "";
            var params = "";
            if( index.$name.SCREEN ) params = iterate( index.$name.SCREEN );
            return "\twindow.closeScreen(" + params + ");\n";
        },

        controls_openAnotherScreen: function( xml, index )
        {
            if( !isInFunc ) return "";
            return "\twindow.openAnotherScreen( " + iterate( index.$name.SCREEN ) + ");\n";
        },
        
        controls_openAnotherScreenWithStartValue: function( xml, index )
        {
            if( !isInFunc ) return "";
            return "\twindow.openAnotherScreen( " + iterate( index.$name.SCREENNAME ) + ", " + iterate( index.$name.STARTVALUE ) + ");\n";
        },

        controls_do_then_return: function( xml, index )
        {
            if( !isInFunc ) return "";
            return "(function(){" + iterate( index.statement[0] ) + "\treturn " + iterate( index.value[0] ) + ";\n}).apply(this)";
        },

        controls_eval_but_ignore:function(xml, index){
            if( !isInFunc ) return "";
            return "\t" + iterate(index.$name.VALUE) + ";\n";
        },

        controls_choose:function(xml, index){
            if( !isInFunc ) return "";
            return "((" + (iterate(index.$name.TEST)||"false") 
                + ") ? (" + (iterate(index.$name.THENRETURN)||"''") 
                + ") : (" + (iterate(index.$name.ELSERETURN)||"''") + "))";
        },

        controls_if: function( xml, index )
        {
            if( !isInFunc ) return "";
            var ret = "\tif(" + iterate( index.value[0] ) + " ){\n";
            ret += iterate( index.statement[0] );
            for( var i=1; i<index.value.length; ++i )
            {
                ret += "\t}else if(" + iterate( index.value[i] ) + " ){\n";
                ret += iterate( index.statement[i] );
            }
            if( index.$name.ELSE )
            {
                ret += "\t} else {\n";
                ret += iterate( index.$name.ELSE );
            }
            ret += "\t}\n";
            return ret;
        },

        controls_forEach: function( xml, index )
        {
            if( !isInFunc ) return "";
            var ctxId = ++usid;
            var item = safeName(index.$name.VAR.textContent);
            var ctx = {};
            ctx[item] = usid;
            var ret = "\tvar " + local("__list", ctxId) + " = " + iterate( index.$name.LIST ) + ";\n";
            stack.push( ctx );
            ret += "\tfor( var " + local("__counter", ctxId) + " = 0; " + local("__counter", ctxId) + " < " + local("__list", ctxId) + ".length; ++" + local("__counter", ctxId) + " ){\n";
            ret += "\t" + local(item, ctxId) + " = " + local("__list", ctxId) + "[ " + local("__counter", ctxId) + " ];\n";
            ret += iterate( index.statement[0] );
            ret += "\t}\n";
            stack.pop();
            return ret;
        },

        controls_forRange: function( xml, index )
        {
            if( !isInFunc ) return "";
            var ctxId = ++usid;
            var ctx = {};
            var counter = safeName(index.$name.VAR.textContent);
            ctx[counter] = usid;
            stack.push( ctx );

            var ret = "\tvar " + local("STEP", ctxId) + " = " + iterate(index.$name.STEP) + ";\n";
            ret += "\tvar " + local("START", ctxId) + " = " + local(counter, ctxId) + " = " + iterate(index.$name.START) + ";\n";
            ret += "\tvar " + local("END", ctxId) + " = " + iterate(index.$name.END) + ";\n";
            ret += "\tif(";
            ret +=      "(" + local("STEP", ctxId) + " > 0 && " + local(counter, ctxId) + " < " + local("END", ctxId) + ") || ";
            ret +=      "(" + local("STEP", ctxId) + " < 0 && " + local(counter, ctxId) + " > " + local("END", ctxId) + ") ) ";
            ret += "do{\n";
            ret += "\t" + iterate( index.statement[0] );
            ret += "\t\t" + local(counter, ctxId) + " += " + local("STEP", ctxId) + ";\n";
            ret += "\t}while(  ";
            ret += "(" + local("END", ctxId) + " > " + local("START", ctxId) + " && " + local(counter, ctxId) + " < " + local("END", ctxId) + " + " + local("STEP", ctxId) + ")";
            ret +=" || ";
            ret += "(" + local("END", ctxId) + " < " + local("START", ctxId) + " && " + local(counter, ctxId) + " > " + local("END", ctxId) + " + " + local("STEP", ctxId) + ")";
            ret +=" )\n";
            stack.pop();
            return ret;
        },

        controls_while: function( xml, index )
        {
            if( !isInFunc ) return "";
            var ret = "\twhile(" + iterate( index.value[0] ) + " ){\n";
            ret += iterate( index.statement[0] );
            ret += "\t}\n";
            return ret;
        },

        local_declaration_statement: function( xml, index )
        {
            if( !isInFunc ) return "";
            ++usid;
            var ctx = {};
            var ret = "";
            for( var i=0; index.$name["VAR" + i]; ++i )
            {
                var name = index.$name["VAR" + i].textContent;
                ret += '\tvar _' + usid + safeName(name)
                if( index.$name["DECL" + i] ){
                    ret += " = ";
                    ret += iterate(index.$name["DECL" + i]);
                }
                ret += ";\n";
                ctx[name] = usid;
            }
            stack.push( ctx );
            ret += iterate( index.statement[0] );
            stack.pop();
            return ret;
        },

        local_declaration_expression: function( xml, index )
        {
            if( !isInFunc ) return "";
            ++usid;
            var ctx = {};
            var ret = "(function(){\n";
            for( var i=0; index.$name["VAR" + i]; ++i )
            {
                var name = index.$name["VAR" + i].textContent;
                ret += '\tvar _' + usid + safeName(name);
                if( index.$name["DECL" + i] ){
                    ret += " = ";
                    ret += iterate(index.$name["DECL" + i]);
                }
                ret += ";\n";
                ctx[name] = usid;
            }
            stack.push( ctx );
            ret += "return " + iterate(index.$name.RETURN) + ";\n}).apply(this)";
            stack.pop();
            return ret;
        },

        lexical_variable_set:function( xml, index )
        {
            if( !isInFunc ) return "";
            var name = index.$name.VAR.textContent;
            if( !index.value || !index.value[0] )
            {
                console.error("Assign with no value.");
                return "/*" + name + " = ???;*/\n";
            }
            var ctx = "";
            var prefix = "";
            if( name.indexOf("global ") == 0 ) ctx = "$";
            else
            {
                for( var i=stack.length-1; !prefix && i>=0; i-- )
                {
                    prefix = stack[i][name];
                }
                if( prefix ) prefix = "_" + prefix;
                else{ ctx = "ctx."; prefix = ""; }
            }
            return "\t" + ctx + prefix + safeName(name) + " = " + iterate( index.value[0] ) + ";\n";
        },

        lexical_variable_get:function( xml, index )
        {
            if( !isInFunc ) return "";
            var name = index.$name.VAR.textContent;
            var ctx = "";
            var prefix = "";
            if( name.indexOf("global ") == 0 ) ctx = "$";
            else
            {
                for( var i=stack.length-1; !prefix && i>=0; i-- )
                {
                    prefix = stack[i][name];
                }
                if( prefix ) prefix = "_" + prefix;
                else{ ctx = "ctx."; prefix = ""; }
            }
            return ctx + prefix + safeName(name);
        },

        text:function( xml, index )
        {
            if( !isInFunc ) return "";
            return "'" + index.$name.TEXT.textContent.replace(/'/g, "\\'") + "'";
        },

        text_split:function( xml, index )
        {
            if( !isInFunc ) return "";
            return iterate(index.$name.TEXT) + ".split(" + iterate(index.$name.AT) + ")";
        },

        logic_boolean:function( xml, index )
        {
            if( !isInFunc ) return "";
            return index.$name.BOOL.textContent == "TRUE";
        },

        logic_false:function( xml, index )
        {
            if( !isInFunc ) return "";
            return index.$name.BOOL.textContent == "TRUE";
        },

        logic_negate:function( xml, index )
        {
            if( !isInFunc ) return "";
            return "!(" + iterate(index.$name.BOOL) + ")";
        },
        
        math_neg:function( xml, index )
        {
            if( !isInFunc ) return "";
            return "-(" + iterate(index.$name.NUM) + ")";
        },

        math_single:function( xml, index )
        {
            if( !isInFunc ) return "";
            return {NEG:"-"}[index.$name.OP.textContent] + "(" + iterate(index.$name.NUM) + ")";
        },
        
        math_number:function( xml, index )
        {
            if( !isInFunc ) return "";
            return index.$name.NUM.textContent;
        },

        math_trig:math,
        math_tan:math,
        math_cos:math,
        math_abs:math,
        math_round:math,

        lists_copy:function(xml, index){
            if( !isInFunc ) return "";
            return "JSON.parse( JSON.stringify( " + iterate(index.$name.LIST) + " ) )"
        },

        lists_create_with: function( xml, index ){
            if( !isInFunc ) return "";
            var args = [];
            if( index.value )
                for( var i=0; i<index.value.length; ++i )
                    args.push( iterate( index.value[i] ) );

            return "[" + args.join(", ") + "]";
        },

        lists_to_csv_row: lib.bind(this, false),
        lists_from_csv_table: lib.bind(this, false),
        
        lists_add_items: function( xml, index ){
            if( !isInFunc ) return "";
            var ret = "\t" + iterate( index.$name.LIST ) + ".push( ";
            var args = [];
            if( index.value )
                for( var i=1; i<index.value.length; ++i )
                    args.push( iterate( index.value[i] ) );

            ret += args.join(", ") + " );\n";
            return ret;
        },
        text_join: function( xml, index ){
            if( !isInFunc ) return "";
            var args = ["''"];
            if( index.value )
                for( var i=0; i<index.value.length; ++i )
                    args.push( iterate( index.value[i] ) );

            return "(" + args.join(") + (") + ")";
        },        
        lists_position_in: function( xml, index ){
            if( !isInFunc ) return "";
            return "(" + iterate(index.$name.LIST) + ".indexOf(" + iterate(index.$name.ITEM) + ")+1)";
        },
        color_make_color: function( xml, index ){
            if( !isInFunc ) return "";
            return "new LIB.Color(" + iterate( index.$name.COLORLIST ) + " )";
        },
        lists_length: function( xml, index ){
            if( !isInFunc ) return "";
            return iterate( index.$name.LIST ) + ".length";
        },
        lists_is_empty: function( xml, index ){
            if( !isInFunc ) return "";
            return "(" + iterate( index.$name.LIST ) + ".length == 0)";
        },
        lists_select_item: function( xml, index )
        {
            if( !isInFunc ) return "";
            return iterate( index.$name.LIST ) + "[(" + iterate( index.$name.NUM ) + ")-1]";
        },
        lists_remove_item: function( xml, index )
        {
            if( !isInFunc ) return "";
            return "\t" + iterate( index.$name.LIST ) + ".splice(" + iterate( index.$name.INDEX ) + "-1 , 1 );\n";
        },
        lists_replace_item: function( xml, index )
        {
            if( !isInFunc ) return "";
            return "\t" + iterate( index.$name.LIST ) + "[(" + iterate( index.$name.NUM ) + ")-1] = " + iterate( index.$name.ITEM ) + ";\n";
        },

        math_random_int: function( xml, index ){
            if( !isInFunc ) return "";
            return "LIB.random(" + iterate(index.$name.FROM) + ", " + iterate(index.$name.TO) + ")";
            if( !isInFunc ) return "";
        },
        math_is_a_number: function( xml, index ){
            if( !isInFunc ) return "";
            return "!isNaN(parseFloat(" + iterate(index.$name.NUM) + "))";
        },

        math_subtract: mathOp.bind(this, "-"),
        math_add: mathOp.bind(this, "+"),
        math_divide: mathOp.bind(this, null),
        math_division: mathOp.bind(this, "/"),
        math_multiply: mathOp.bind(this, "*"),
        text_compare:  mathOp.bind(this, null),
        math_compare:  mathOp.bind(this, null),
        logic_compare:  mathOp.bind(this, null),
        logic_operation:  mathOp.bind(this, null),

        yacodeblocks:function(){return ""}
    };

    var ret = iterate(xml.childNodes[0]);
    // console.log(ret);
    return "(function($SCREEN){var $COM = $SCREEN.components;\n" + ret + "}).call($SCREEN, $SCREEN)";
}
