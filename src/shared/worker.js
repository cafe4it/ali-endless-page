onmessage = function(e){
    var nextPage = e.data;
    console.info(nextPage);
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(){
        if(request.readyState === 4 && request.status === 200){
            var html = request.responseText.replace(/(?:\r\n|\r|\n)/g, ''),
                htmlInner = html.match(/<html[^>]*>((.|[\n\r])*)<\/html>/im);
            postMessage(htmlInner[1] || '');
        }
    }
    request.open('GET', nextPage);
    request.send();
}