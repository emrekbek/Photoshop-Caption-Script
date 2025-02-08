// ===== AutoResizePlaceAndTextCustomMarginsAutoFit.jsx =====
// This script performs the following:
// 1. Sets the background to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at TOPLEFT).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Creates a text box in the visible black area with custom margins:
//      - Vertical margins: 0.025 × document height (top and bottom)
//      - Horizontal margins: 0.025 × (visible black area width)
// 7. Iteratively adjusts the font size so that the text fits within the text box.

//
// Step 1. Set Photoshop's background color to black.
var blackColor = new SolidColor();
blackColor.rgb.red = 0;
blackColor.rgb.green = 0;
blackColor.rgb.blue = 0;
app.backgroundColor = blackColor;

//
// Step 2. Get the active document and its dimensions.
var doc = app.activeDocument;
var origWidth = doc.width.as("px");
var origHeight = doc.height.as("px");

//
// Step 3. Resize the canvas to 3× original width (keeping the same height),
// anchoring at the TOPLEFT so the original image remains in the upper-left.
doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

//
// Step 4. Process the image layer.
// If the image is a background (locked) layer, duplicate it so it can be moved.
var imageLayer;
if (doc.activeLayer.isBackgroundLayer) {
    imageLayer = doc.activeLayer.duplicate();
    doc.activeLayer.remove();
} else {
    imageLayer = doc.activeLayer;
}

// Move the image layer so that its top-left corner is at (0,0).
var bounds = imageLayer.bounds; // [left, top, right, bottom]
var deltaX = -bounds[0].as("px");
var deltaY = -bounds[1].as("px");
imageLayer.translate(deltaX, deltaY);

//
// Step 5. Fill the extended canvas area with black.
// Create a new layer, select the whole canvas, fill it with black, then move it to the bottom.
var bgLayer = doc.artLayers.add();
bgLayer.name = "Background";
doc.selection.selectAll();
doc.selection.fill(blackColor);
doc.selection.deselect();
bgLayer.move(doc, ElementPlacement.PLACEATEND);

//
// Step 6. Create a text box with custom dynamic margins inside the visible black area.
// The visible black area is the right 2×origWidth of the canvas (from x = origWidth to 3×origWidth).
// Define margins:
//    Vertical margin = 0.025 × origHeight
//    Horizontal margin = 0.025 × (2 × origWidth)
var marginVert = 0.025 * origHeight;
var marginHoriz = 0.025 * (2 * origWidth);

// Determine text box position and size:
var textX = origWidth + marginHoriz;                // X position within the black area
var textY = marginVert;                             // Y position (margin from top)
var textWidth = (2 * origWidth) - (2 * marginHoriz);  // Available width inside the black area
var textHeight = origHeight - (2 * marginVert);       // Available height

// Prompt the user for ChatGPT output.
var chatGPTOutput = prompt("Paste your ChatGPT conversation output here:", "");
if (chatGPTOutput === null || chatGPTOutput === "") {
    chatGPTOutput = "No output provided.";
} else {
    // Remove newline characters so the output becomes one paragraph.
    chatGPTOutput = chatGPTOutput.replace(/\r?\n|\r/g, " ");
}

// Now use chatGPTOutput for your text layer...
var textLayer = doc.artLayers.add();
textLayer.kind = LayerKind.TEXT;
textLayer.name = "ChatGPT Conversation";
textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
textLayer.textItem.contents = chatGPTOutput;



// Create a new text layer (paragraph/text box).
var textLayer = doc.artLayers.add();
textLayer.kind = LayerKind.TEXT;
textLayer.name = "ChatGPT Conversation";
textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
textLayer.textItem.contents = chatGPTOutput;

// Set the text box's position and dimensions.
textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
textLayer.textItem.width = new UnitValue(textWidth, "px");
textLayer.textItem.height = new UnitValue(textHeight, "px");

// Optional: Set initial text formatting.
textLayer.textItem.font = "ArialMT"; // Change to your desired font.
textLayer.textItem.size = new UnitValue(24, "px"); // Start with a font size of 24px.
var textColor = new SolidColor();
textColor.rgb.red = 255;
textColor.rgb.green = 255;
textColor.rgb.blue = 255;
textLayer.textItem.color = textColor;

//
// Step 7. Function to adjust the font size so that the rendered text fits inside the text box.
function adjustFontSizeToFit(layer, maxWidth, maxHeight) {
    // Get the current font size in pixels.
    var currentSize = parseFloat(layer.textItem.size.as("px"));
    var decrement = 1; // Decrease font size by 1px per iteration.
    
    // Get the rendered text bounds.
    var b = layer.bounds;  // Returns [left, top, right, bottom]
    var renderedWidth = b[2].as("px") - b[0].as("px");
    var renderedHeight = b[3].as("px") - b[1].as("px");
    
    // Loop: reduce the font size until the text fits within the given dimensions.
    while ((renderedWidth > maxWidth || renderedHeight > maxHeight) && currentSize > decrement) {
        currentSize -= decrement;
        layer.textItem.size = new UnitValue(currentSize, "px");
        // Recalculate bounds after font size change.
        b = layer.bounds;
        renderedWidth = b[2].as("px") - b[0].as("px");
        renderedHeight = b[3].as("px") - b[1].as("px");
    }
}

// Call the function to adjust the font size.
adjustFontSizeToFit(textLayer, textWidth, textHeight);

alert("Canvas resized, image repositioned, text box added, and text auto-adjusted to fit!");
