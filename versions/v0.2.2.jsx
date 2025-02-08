// ---------------------
// Step 7. Create a text box with a dynamic margin from the borders.
// Define a margin variable (in pixels). You can adjust this value as needed.
var margin = 20;

// Define your ChatGPT conversation output text.
var chatGPTOutput = "This is an example output from a ChatGPT conversation.\nReplace this text with your actual conversation output.";

// Determine the placement and dimensions for the text box:
// - The image occupies the left part with a width of 'origWidth' pixels.
// - We leave a margin to the right of the image: text box X = origWidth + margin.
// - Also, leave a margin from the top edge: text box Y = margin.
// - For the width: the available area on the right side is 2*origWidth. To have a margin on both
//   the left and right sides of this area, subtract 2*margin.
// - Similarly, for the height, subtract top and bottom margins.
var textX = origWidth + margin;
var textY = margin;
var textWidth = 2 * origWidth - 2 * margin;
var textHeight = origHeight - 2 * margin;

// Create a new text layer.
var textLayer = doc.artLayers.add();
textLayer.kind = LayerKind.TEXT;
textLayer.name = "ChatGPT Conversation";

// Specify that the text should be in paragraph (box) format.
textLayer.textItem.kind = TextType.PARAGRAPHTEXT;

// Set the text contents.
textLayer.textItem.contents = chatGPTOutput;

// Set the text box's position (the top–left corner of the box).
textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];

// Set the bounding box dimensions.
textLayer.textItem.width = new UnitValue(textWidth, "px");
textLayer.textItem.height = new UnitValue(textHeight, "px");

// Optional: Define text formatting (font, size, and color).
textLayer.textItem.font = "ArialMT"; // Change to your desired font.
textLayer.textItem.size = new UnitValue(24, "px");
var textColor = new SolidColor();
textColor.rgb.red = 255;
textColor.rgb.green = 255;
textColor.rgb.blue = 255;
textLayer.textItem.color = textColor;
