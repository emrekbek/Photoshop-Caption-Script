// ===== AutoResizePlaceAndTextCustomMargins.jsx =====
// This script assumes an image is open in Photoshop.
// It does the following:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at the top-left).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Creates a text box in the black area with margins:
//      - Vertical margins: 0.025 × document height (from top and bottom)
//      - Horizontal margins: 0.025 × (visible black area width) (from left and right within the black area)

//
// Step 1. Set Photoshop's background color to black.
var blackColor = new SolidColor();
blackColor.rgb.red = 0;
blackColor.rgb.green = 0;
blackColor.rgb.blue = 0;
app.backgroundColor = blackColor;

//
// Step 2. Get the active document and its dimensions (in pixels).
var doc = app.activeDocument;
var origWidth = doc.width.as("px");
var origHeight = doc.height.as("px");

//
// Step 3. Resize the canvas.
// New width = 3 × original width; height remains the same.
// Anchor at TOPLEFT so the original image remains at the top-left.
doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

//
// Step 4. Work with the image layer.
// If the image is a background (locked) layer, duplicate it to unlock it.
var imageLayer;
if (doc.activeLayer.isBackgroundLayer) {
    imageLayer = doc.activeLayer.duplicate();
    doc.activeLayer.remove();
} else {
    imageLayer = doc.activeLayer;
}

// Move the image layer so that its top-left corner is exactly at (0,0).
var bounds = imageLayer.bounds; // [left, top, right, bottom]
var deltaX = -bounds[0].as("px");
var deltaY = -bounds[1].as("px");
imageLayer.translate(deltaX, deltaY);

//
// Step 5. Fill the extended canvas area with black.
// Create a new layer, select the whole canvas, fill it with black, and move it to the bottom.
var bgLayer = doc.artLayers.add();
bgLayer.name = "Background";
doc.selection.selectAll();
doc.selection.fill(blackColor);
doc.selection.deselect();
bgLayer.move(doc, ElementPlacement.PLACEATEND);

//
// Step 6. Create a text box with custom dynamic margins inside the visible black area.
// The visible black area is the right portion of the canvas:
//   - It starts at x = origWidth and extends to 3 × origWidth, so its width = 2 × origWidth.
//   - Its height is the same as origHeight.
//
// Calculate the margins based on your requirements:
//   Vertical margin = 0.025 × origHeight
//   Horizontal margin = 0.025 × (2 × origWidth)
var marginVert = 0.025 * origHeight;
var marginHoriz = 0.025 * (2 * origWidth);

//
// Calculate the text box position and dimensions.
// The text box will reside within the visible black area.
var textX = origWidth + marginHoriz;           // Positioned within the black area (shifted right of the image)
var textY = marginVert;                          // Margin from the top of the canvas
var textWidth = (2 * origWidth) - (2 * marginHoriz); // Available width in the black area minus left/right margins
var textHeight = origHeight - (2 * marginVert);      // Available height minus top/bottom margins

//
// Define your ChatGPT conversation output text.
var chatGPTOutput = "This is an example ChatGPT conversation output.\nReplace this text with your actual conversation output.";

// Create a new text layer.
var textLayer = doc.artLayers.add();
textLayer.kind = LayerKind.TEXT;
textLayer.name = "ChatGPT Conversation";

// Set the text layer to paragraph (text box) type.
textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
textLayer.textItem.contents = chatGPTOutput;

// Set the text box's top-left position.
textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
// Set the text box's dimensions.
textLayer.textItem.width = new UnitValue(textWidth, "px");
textLayer.textItem.height = new UnitValue(textHeight, "px");

// Optional: Define text formatting (font, size, and color).
textLayer.textItem.font = "ArialMT"; // Change this to your preferred font.
textLayer.textItem.size = new UnitValue(24, "px");
var textColor = new SolidColor();
textColor.rgb.red = 255;
textColor.rgb.green = 255;
textColor.rgb.blue = 255;
textLayer.textItem.color = textColor;

alert("Canvas resized, image repositioned, and text box added with custom dynamic margins!");
