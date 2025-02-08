// ===== AutoResizePlaceAndText_AdjustedText_ExactBottom.jsx =====
// This script:
// 1. Sets the background to black.
// 2. Resizes the canvas to 3× the original width (anchored at TOPLEFT).
// 3. Moves the image layer so its top‑left is at (0,0) and fills the extra area with black.
// 4. Prompts you to paste your multi‑paragraph ChatGPT output (converting newlines to carriage returns).
// 5. Creates a new point text layer (no fixed text box).
// 6. Computes a target rectangle within the visible (black) area with these margins:
//       • Top margin: 0.025×H
//       • Bottom margin: 0.025×H (so target bottom = 0.975×H)
//       • Left/right margin: 0.05×W (since visible width = 2×W)
// 7. Scales the text (by adjusting the font size and matching leading) so that the text’s
//    rendered height exactly equals the target rectangle’s height, and then repositions it
//    so that its top aligns with targetTop.
(function() {
    // ----- Step 1. Set Photoshop's background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;
    blackColor.rgb.green = 0;
    blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;
    
    // ----- Step 2. Get active document dimensions.
    var doc = app.activeDocument;
    var W = doc.width.as("px");
    var H = doc.height.as("px");
    
    // ----- Step 3. Resize canvas to 3×W by H (anchor TOPLEFT).
    doc.resizeCanvas(UnitValue(W * 3, "px"), UnitValue(H, "px"), AnchorPosition.TOPLEFT);
    
    // ----- Step 4. Process the image layer.
    // If the active layer is locked (background), duplicate it so it can be moved.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }
    var imgBounds = imageLayer.bounds; // [left, top, right, bottom]
    var deltaX = -imgBounds[0].as("px");
    var deltaY = -imgBounds[1].as("px");
    imageLayer.translate(deltaX, deltaY);
    
    // ----- Step 5. Fill the extended area with black.
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    doc.selection.selectAll();
    doc.selection.fill(blackColor);
    doc.selection.deselect();
    bgLayer.move(doc, ElementPlacement.PLACEATEND);
    
    // ----- Step 6. Get ChatGPT conversation output via a ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300]; // Adjust as needed.
        var buttonGroup = dlg.add("group");
        buttonGroup.alignment = "right";
        var okButton = buttonGroup.add("button", undefined, "OK");
        okButton.onClick = function() { dlg.close(); };
        dlg.show();
        return inputField.text;
    }
    var chatGPTOutput = getChatGPTOutput();
    if (chatGPTOutput === "") {
        chatGPTOutput = "No output provided.";
    } else {
        // Replace newline characters with carriage returns so Photoshop treats them as paragraph breaks.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }
    
    // ----- Step 7. Define the target rectangle within the visible (black) area.
    // The visible (black) area is the right 2×W (from x = W to x = 3W).
    // Set margins:
    //   Vertical margin = 0.025 × H.
    //   Horizontal margin = 0.025 × (visible width) = 0.025 × (2W) = 0.05 × W.
    var marginVert = 0.025 * H;
    var marginHoriz = 0.05 * W;
    var targetTop = marginVert;                        // = 0.025×H.
    var targetBottom = H - marginVert;                 // = 0.975×H.
    var targetLeft = W + marginHoriz;                  // = W + 0.05×W = 1.05×W.
    var targetRight = (3 * W) - marginHoriz;           // = 3W - 0.05×W = 2.95×W.
    var targetWidth = targetRight - targetLeft;        // = 2.95W - 1.05W = 1.9W.
    var targetHeight = targetBottom - targetTop;       // = 0.975H - 0.025H = 0.95H.
    
    // ----- Step 8. Create a new point text layer.
    // (Point text respects carriage returns and is not confined by a fixed text box.)
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.POINTTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    // Set initial formatting.
    textLayer.textItem.font = "ArialMT";       // Change as desired.
    textLayer.textItem.size = new UnitValue(24, "px"); // Starting font size.
    textLayer.textItem.autoLeading = false;
    textLayer.textItem.leading = new UnitValue(24, "px");
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // By default, the text's insertion point is at the position property.
    // We now position the text so that its rendered bounding box’s top is at targetTop.
    // (Later, we will scale the text so its bottom exactly equals targetBottom.)
    // First, translate the text so that its current top aligns with targetTop.
    var currBounds = textLayer.bounds;  // [left, top, right, bottom]
    var currTop = currBounds[1].as("px");
    textLayer.translate(0, targetTop - currTop);
    
    // ----- Step 9. Adjust the text’s font size (with fixed leading) so that
    // the rendered text height equals the targetHeight.
    // We do this iteratively.
    function adjustTextToExactHeight(layer, targetHeight, tolerance) {
        tolerance = tolerance || 0.5; // in pixels
        for (var i = 0; i < 10; i++) {
            var b = layer.bounds;
            var renderedHeight = b[3].as("px") - b[1].as("px");
            var error = renderedHeight - targetHeight;
            if (Math.abs(error) <= tolerance) {
                break; // within tolerance
            }
            // Get current font size.
            var currentSize = parseFloat(layer.textItem.size.as("px"));
            // Compute a scale factor: desired new size = currentSize * (targetHeight / renderedHeight)
            var newSize = currentSize * (targetHeight / renderedHeight);
            // Update the font size and leading.
            layer.textItem.size = new UnitValue(newSize, "px");
            layer.textItem.leading = new UnitValue(newSize, "px");
            // Reposition so that the top stays at targetTop.
            b = layer.bounds;
            var newTop = b[1].as("px");
            layer.translate(0, targetTop - newTop);
        }
    }
    
    adjustTextToExactHeight(textLayer, targetHeight, 0.5);
    
    // ----- (Optional) Final horizontal check:
    // Ensure the text's left edge is at least targetLeft.
    var finalBounds = textLayer.bounds;
    var finalLeft = finalBounds[0].as("px");
    if (finalLeft < targetLeft) {
        textLayer.translate(targetLeft - finalLeft, 0);
    }
    
    alert("Canvas resized, image repositioned, and text adjusted.\n" +
          "Text top = " + targetTop + "px, bottom = " + targetBottom + "px (exactly " + (H * 0.025) + "px margin).");
})();
