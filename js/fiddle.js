function makeBox(className, title, content) {
  var output = [
    "<div class='" + className + " box'>",
    "  <div class='title'>" + title + "</div>",
    "  <div class='content'>" + content + "</div>",
    "</div>"
  ];
  return output.join("\n");
}

function makeErrorList(items) {
  if ( !items || !items.length ) {
    return "";
  }
  var output = ["<ul>"];
  for ( var i = 0, len = items.length; i < len; i++ ) {
    var err = items[i];
    output.push("<li>" + err.message + " (" + err.line + ":" + err.column + ")</li>");
  }
  output.push("</ul>");
  return makeBox("errors", "Warnings", output.join("\n"));
}

function evaluateTemplate(data) {
  var result;
  try {
    var compileOutput = interpol.compile($('#fiddle').html());
    var wrapper = new Function(['r'], compileOutput.templateBody);
    var template = wrapper(interpol.runtime());
    result = '';
    result += makeBox("result", "Output", template(data));
    result += makeErrorList(compileOutput.err);
  }
  catch ( err ) {
    result = err.toString();
  }
  $('body').html(result);
}
