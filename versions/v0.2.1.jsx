// ===== AutoResizePlaceAndText.jsx =====
// This script assumes an image is open in Photoshop.
// It performs the following steps:
// 1. Sets the background color to black.
// 2. Resizes the canvas to 3×the original width (same height), anchoring at TOPLEFT.
// 3. Moves the image layer so its top–left is at (0,0).
// 4. Fills the extra canvas area with black.
// 5. Creates a paragraph text box (with a 20-pixel margin)
//    in the black area (to the right of the image) containing a ChatGPT conversation output.

// ---------------------
// Step 1. Set Photoshop's background color to black.
var blackColor = new SolidColor();
blackColor.rgb.red = 0;
blackColor.rgb.green = 0;
blackColor.rgb.blue = 0;
app.backgroundColor = blackColor;

// ---------------------
// Step 2. Get the active document and its dimensions (in pixels).
var doc = app.activeDocument;
var origWidth = doc.width.as("px");
var origHeight = doc.height.as("px");

// ---------------------
// Step 3. Resize the canvas:
//    New width = 3 * original width; height remains the same.
//    Anchor at TOPLEFT so that the original image remains at the top–left.
doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

// ---------------------
// Step 4. Work with the image layer.
//    If the image is a background layer (locked), duplicate it to make it movable.
var imageLayer;
if (doc.activeLayer.isBackgroundLayer) {
    imageLayer = doc.activeLayer.duplicate();
    doc.activeLayer.remove();
} else {
    imageLayer = doc.activeLayer;
}

// ---------------------
// Step 5. Move the image layer so its top–left corner sits at (0,0).
var bounds = imageLayer.bounds; // returns [left, top, right, bottom]
var deltaX = -bounds[0].as("px");
var deltaY = -bounds[1].as("px");
imageLayer.translate(deltaX, deltaY);

// ---------------------
// Step 6. Fill the extended canvas area with black.
//    Add a new layer, fill it with black, then move it to the bottom.
var bgLayer = doc.artLayers.add();
bgLayer.name = "Background";
doc.selection.selectAll();
doc.selection.fill(blackColor);
doc.selection.deselect();
bgLayer.move(doc, ElementPlacement.PLACEATEND);

// ---------------------
// Step 7. Create a text box to display a ChatGPT conversation output.
// We'll place the text box in the black area (to the right of the image)
// leaving a margin of 20 pixels from the image border and canvas edges.

// Define your ChatGPT conversation output text.
var chatGPTOutput = "This is an example output from a ChatGPT conversation.\nReplace this text with your actual conversation output.";

// Determine the placement and dimensions for the text box:
// - The image occupies the left part with a width of 'origWidth' pixels.
// - We leave a 20-pixel margin to the right of the image: text box X = origWidth + 20.
// - Also, leave 20 pixels from the top edge.
// - For the width: the overall canvas width is 3 * origWidth, so the available width is:
//       3*origWidth - (origWidth + 20 [left margin] + 20 [right margin])
//     which simplifies to: 2*origWidth - 40.
// - Similarly, for the height, leave 20 pixels at both the top and bottom: height = origHeight - 40.
var textX = origWidth + 20;
var textY = 20;
var textWidth = 2 * origWidth - 40;
var textHeight = origHeight - 40;

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
// Change "ArialMT" to your preferred font if needed.
textLayer.textItem.font = "ArialMT";
textLayer.textItem.size = new UnitValue(24, "px");
var textColor = new SolidColor();
textColor.rgb.red = 255;
textColor.rgb.green = 255;
textColor.rgb.blue = 255;
textLayer.textItem.color = textColor;

alert("Canvas resized, image repositioned, and text box added!");
