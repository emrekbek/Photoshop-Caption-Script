// ===== AutoResizePlaceAndTextDynamicMargins.jsx =====
// This script assumes an image is open in Photoshop.
// It performs the following steps:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at the top-left).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Creates a text box with margins defined as 0.1× the height (vertical) and
//    0.1× the visible black area’s width (horizontal) away from the edges of the black area.

// ----------
// Step 1. Set Photoshop's background color to black.
var blackColor = new SolidColor();
blackColor.rgb.red = 0;
blackColor.rgb.green = 0;
blackColor.rgb.blue = 0;
app.backgroundColor = blackColor;

// ----------
// Step 2. Get the active document and its dimensions (in pixels).
var doc = app.activeDocument;
var origWidth = doc.width.as("px");
var origHeight = doc.height.as("px");

// ----------
// Step 3. Resize the canvas:
// New width = 3 × original width; height remains the same.
// Anchor at TOPLEFT so the original image remains at the top-left.
doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

// ----------
// Step 4. Prepare the image layer.
// If the image is a background (locked) layer, duplicate it to unlock it.
var imageLayer;
if (doc.activeLayer.isBackgroundLayer) {
    imageLayer = doc.activeLayer.duplicate();
    doc.activeLayer.remove();
} else {
    imageLayer = doc.activeLayer;
}

// Move the image layer so its top-left corner is exactly at (0,0).
var bounds = imageLayer.bounds; // returns [left, top, right, bottom] as UnitValue objects.
var deltaX = -bounds[0].as("px");
var deltaY = -bounds[1].as("px");
imageLayer.translate(deltaX, deltaY);

// ----------
// Step 5. Fill the extended canvas area with black.
// Create a new layer, select the whole canvas, fill with black, then move it to the bottom.
var bgLayer = doc.artLayers.add();
bgLayer.name = "Background";
doc.selection.selectAll();
doc.selection.fill(blackColor);
doc.selection.deselect();
bgLayer.move(doc, ElementPlacement.PLACEATEND);

// ----------
// Step 6. Create a text box with dynamic margins inside the black area.
// The black (visible) area is the right portion of the canvas.
// Its dimensions are:
//    - x: from origWidth to 3 * origWidth  → width = 2 * origWidth
//    - y: 0 to origHeight                  → height = origHeight
//
// We'll set:
//    - Vertical margin = 0.1 × origHeight (top and bottom)
//    - Horizontal margin = 0.1 × (2 * origWidth) (left and right within the black area)

var chatGPTOutput = "This is an example ChatGPT conversation output.\nReplace this text with your actual conversation output.";

// Calculate margins.
var blackAreaWidth = 2 * origWidth;
var marginHoriz = 0.1 * blackAreaWidth;  // Horizontal margin (10% of the black area's width)
var marginVert = 0.1 * origHeight;         // Vertical margin (10% of the height)

// Determine the text box position and dimensions.
// The black area starts at x = origWidth.
var textX = origWidth + marginHoriz;          // x position inside the black area
var textY = marginVert;                       // y position from the top of the canvas
var textWidth = blackAreaWidth - 2 * marginHoriz;  // available width inside the black area
var textHeight = origHeight - 2 * marginVert;      // available height

// Create a new text layer.
var textLayer = doc.artLayers.add();
textLayer.kind = LayerKind.TEXT;
textLayer.name = "ChatGPT Conversation";

// Use paragraph text (text box) format.
textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
textLayer.textItem.contents = chatGPTOutput;

// Set the text box's top-left position.
textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
// Set the text box's dimensions.
textLayer.textItem.width = new UnitValue(textWidth, "px");
textLayer.textItem.height = new UnitValue(textHeight, "px");

// Optional formatting: set font, size, and color.
textLayer.textItem.font = "ArialMT"; // Change this to your desired font.
textLayer.textItem.size = new UnitValue(24, "px");
var textColor = new SolidColor();
textColor.rgb.red = 255;
textColor.rgb.green = 255;
textColor.rgb.blue = 255;
textLayer.textItem.color = textColor;

alert("Canvas resized, image repositioned, and text box added with dynamic margins!");
