(function(i){if(!i)throw Error('Interpol not loaded');var b={},c={},d='/index',r=i.resolvers().slice(0);r.push({resolveExports:function(n){var e=c[n];if(e){return e;}var m=b[n]||b[n+d];if(!m){return null;}return c[n]=m.exports();},resolveModule:function(n){return b[n]||b[n+d];}});var j={"test":{"i":"interpol","v":"0.3.6","l":["de","renderList","people","op","ul","ou","\n","fr","person","id","brother","mb","brothers","ca","renderItem","name","cl","li","fm","%brother is the brother of %name","se","renderTest","Hello %name","h2","title","There are %length stooges"],"n":[[0,1,[2],[[3,4,[],0],[5,6],[7,[[8,[9,2]],[10,[11,[9,8],12]]],[[5,[13,[9,14],[[11,[9,8],15],[9,10]]]],[5,6]]],[16,4],[5,6]]],[0,14,[15,10],[[3,17,[],0],[5,[18,19,[20]]],[16,17],[5,6]]],[0,21,[15],[[5,[18,22,[20]]],[5,6]]],[3,23,[],0],[5,[9,24]],[16,23],[5,6],[5,[18,25,[9,2]]],[5,6],[5,[13,[9,1],[[9,2]]]],[5,6]]}};for(var k in j){b[k]=i(j[k],{resolvers:r});}i.testApp=b;j=null;})(typeof require==='function'?require('interpol'):this.$interpol);