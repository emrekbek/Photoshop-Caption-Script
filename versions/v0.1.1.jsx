// ===== AutoResizeAndPlace.jsx =====
// This script assumes an image is open in Photoshop.
// It will resize the canvas to (3×width, same height),
// move the image layer so its top–left is at (0,0),
// and ensure the extra (canvas) area is filled with black.

// 1. Set Photoshop's background color to black.
var blackColor = new SolidColor();
blackColor.rgb.red = 0;
blackColor.rgb.green = 0;
blackColor.rgb.blue = 0;
app.backgroundColor = blackColor;

// 2. Get the active document and its dimensions (in pixels).
var doc = app.activeDocument;
var origWidth = doc.width.as("px");
var origHeight = doc.height.as("px");

// 3. Resize the canvas:
//    New width = 3 * original width, height remains the same.
//    Anchor at TOPLEFT so that the original image stays in the top–left.
doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

// 4. Work with the image layer.
//    If the image is a background layer (which is locked) we must convert it
//    to a normal layer so we can move it. One common trick is to duplicate it and delete the original.
var imageLayer;
if (doc.activeLayer.isBackgroundLayer) {
    imageLayer = doc.activeLayer.duplicate();
    // Remove the original background layer.
    doc.activeLayer.remove();
} else {
    imageLayer = doc.activeLayer;
}

// 5. Move the image layer so that its top–left corner sits at (0,0).
//    The layer's bounds array returns [left, top, right, bottom] as UnitValues.
var bounds = imageLayer.bounds; // e.g., [left, top, right, bottom]
var deltaX = -bounds[0].as("px");
var deltaY = -bounds[1].as("px");
imageLayer.translate(deltaX, deltaY);

// 6. Ensure the extended (empty) area is filled with black.
//    If you have a background layer, resizing a background layer fills the extra area
//    with the current background color. However, if the image layer is now a normal layer,
//    the canvas’s extra area will be transparent. So, we add a new layer, fill it with black,
//    and move it to the bottom.
var bgLayer = doc.artLayers.add();
bgLayer.name = "Background";
// Select the entire canvas.
doc.selection.selectAll();
// Fill the selection with black.
doc.selection.fill(blackColor);
doc.selection.deselect();
// Move the new layer to the bottom so the image layer sits on top.
bgLayer.move(doc, ElementPlacement.PLACEATEND);

alert("Canvas resized and image repositioned with a black background.");
