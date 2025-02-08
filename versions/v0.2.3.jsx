// ===== CompleteScriptWithDynamicMargin.jsx =====
// This script assumes an image is open in Photoshop and does the following:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3×the original width (anchored at the top-left).
// 4. Moves the image layer to the top-left.
// 5. Fills the extended canvas area with black.
// 6. Creates a text box in the black area using a dynamic margin variable.

// ---------
// Step 1. Set Photoshop's background color to black.
var blackColor = new SolidColor();
blackColor.rgb.red = 0;
blackColor.rgb.green = 0;
blackColor.rgb.blue = 0;
app.backgroundColor = blackColor;

// ---------
// Step 2. Get the active document and its dimensions.
var doc = app.activeDocument;
var origWidth = doc.width.as("px");
var origHeight = doc.height.as("px");

// ---------
// Step 3. Resize the canvas:
// New width = 3 * original width; height remains the same.
// Anchor at TOPLEFT so that the original image remains in the top-left.
doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

// ---------
// Step 4. Work with the image layer.
// If the image is a background layer (locked), duplicate it to make it movable.
var imageLayer;
if (doc.activeLayer.isBackgroundLayer) {
    imageLayer = doc.activeLayer.duplicate();
    doc.activeLayer.remove();
} else {
    imageLayer = doc.activeLayer;
}

// ---------
// Step 5. Move the image layer so its top-left corner is at (0,0).
var bounds = imageLayer.bounds; // returns [left, top, right, bottom] as UnitValue objects.
var deltaX = -bounds[0].as("px");
var deltaY = -bounds[1].as("px");
imageLayer.translate(deltaX, deltaY);

// ---------
// Step 6. Fill the extended canvas area with black.
// Create a new layer, fill the entire canvas, then move it to the bottom.
var bgLayer = doc.artLayers.add();
bgLayer.name = "Background";
doc.selection.selectAll();
doc.selection.fill(blackColor);
doc.selection.deselect();
bgLayer.move(doc, ElementPlacement.PLACEATEND);

// ---------
// Step 7. Create a text box using a dynamic margin from the borders.
// Define a margin variable (in pixels). Adjust this value as needed.
var margin = 20;

// Define your ChatGPT conversation output text.
var chatGPTOutput = "This is an example ChatGPT conversation output.\nReplace this text with your actual conversation output.";

// Calculate the placement and dimensions of the text box.
// The image occupies the left portion with a width of 'origWidth' pixels.
// The text box will be positioned in the right area (canvas width is 3 * origWidth).
// - X position: just to the right of the image plus the margin.
// - Y position: margin from the top.
// - Width: available area on the right is 2 * origWidth, minus margins on both sides.
// - Height: available height is origHeight, minus a top and bottom margin.
var textX = origWidth + margin;
var textY = margin;
var textWidth = 2 * origWidth - 2 * margin;
var textHeight = origHeight - 2 * margin;

// Create a new text layer.
var textLayer = doc.artLayers.add();
textLayer.kind = LayerKind.TEXT;
textLayer.name = "ChatGPT Conversation";

// Specify that the text should be a paragraph (box) type.
textLayer.textItem.kind = TextType.PARAGRAPHTEXT;

// Set the text content.
textLayer.textItem.contents = chatGPTOutput;

// Set the position (top-left corner) of the text box.
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

alert("Canvas resized, image repositioned, and text box added with a dynamic margin!");
