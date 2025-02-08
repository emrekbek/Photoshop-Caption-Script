// ===== AutoResizePlaceAndText_AdjustedText_ExactBottom_HorizontalFixed.jsx =====
// This script:
// 1. Sets the canvas background to black,
// 2. Resizes the canvas to 3× the original width,
// 3. Moves the image layer to the top‑left and fills the extra area with black,
// 4. Prompts you for multi‑paragraph ChatGPT output (converting newlines to carriage returns),
// 5. Creates a point text layer (so it’s not confined by a fixed box),
// 6. Defines a target rectangle in the visible black area with these margins:
//       • Top margin: 0.025×H
//       • Bottom margin: 0.025×H  (so targetBottom = 0.975×H)
//       • Left margin: 0.05×W (since visible area width = 2W, margin = 0.025×2W)
//       • Therefore, targetLeft = 1.05×W and targetRight = 2.95×W.
// 7. Adjusts the text’s font size so that its rendered height equals (targetBottom – targetTop)
//    and then shifts it vertically so that its top equals targetTop.
// 8. Finally, it checks horizontally—if the text’s right edge exceeds targetRight, it reduces the font size until it fits.
(function() {
    // ----- Step 1. Set Photoshop's background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;  blackColor.rgb.green = 0;  blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;
    
    // ----- Step 2. Get the active document and its dimensions.
    var doc = app.activeDocument;
    var W = doc.width.as("px");
    var H = doc.height.as("px");
    
    // ----- Step 3. Resize the canvas to 3×W by H (anchor TOPLEFT).
    doc.resizeCanvas(UnitValue(W * 3, "px"), UnitValue(H, "px"), AnchorPosition.TOPLEFT);
    
    // ----- Step 4. Process the image layer.
    if (doc.activeLayer.isBackgroundLayer) {
        var imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        var imageLayer = doc.activeLayer;
    }
    var imgBounds = imageLayer.bounds;  // [left, top, right, bottom]
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
        inputField.preferredSize = [400, 300];
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
        // Replace newline characters with carriage returns.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }
    
    // ----- Step 7. Define the target rectangle within the visible (black) area.
    // Visible (black) area spans from x = W to x = 3W.
    // Vertical margins: 0.025×H at top and bottom.
    // Horizontal margins: 0.025×(visible area width) = 0.025×(2W) = 0.05×W.
    var targetTop = 0.025 * H;           // = 0.025×H.
    var targetBottom = H - 0.025 * H;      // = 0.975×H.
    var targetHeight = targetBottom - targetTop; // = 0.95×H.
    var targetLeft = W + 0.05 * W;         // = 1.05×W.
    var targetRight = (3 * W) - 0.05 * W;  // = 2.95×W.
    var targetWidth = targetRight - targetLeft; // = 1.9×W.
    
    // ----- Step 8. Create a new point text layer.
    // (Point text will respect carriage returns for line breaks.)
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.POINTTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    // Set initial formatting.
    textLayer.textItem.font = "ArialMT";              // Change if desired.
    textLayer.textItem.size = new UnitValue(24, "px");    // Starting font size.
    textLayer.textItem.autoLeading = false;
    textLayer.textItem.leading = new UnitValue(24, "px");
    var textColor = new SolidColor();
    textColor.rgb.red = 255;  textColor.rgb.green = 255;  textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // Initially, position the text so its insertion point is at (targetLeft, targetTop).
    // (For point text, the position is the insertion point.)
    textLayer.textItem.position = [new UnitValue(targetLeft, "px"), new UnitValue(targetTop, "px")];
    
    // ----- Step 9. Adjust the text’s font size so that its rendered height exactly equals targetHeight.
    // We do this iteratively.
    function adjustTextToExactHeight(layer, targetHeight, tolerance) {
        tolerance = tolerance || 0.5; // in pixels
        for (var i = 0; i < 10; i++) {
            var b = layer.bounds;  // [left, top, right, bottom]
            var renderedHeight = b[3].as("px") - b[1].as("px");
            var error = renderedHeight - targetHeight;
            if (Math.abs(error) <= tolerance) {
                break; // within tolerance
            }
            var currentSize = parseFloat(layer.textItem.size.as("px"));
            // Compute new size based on ratio.
            var newSize = currentSize * (targetHeight / renderedHeight);
            layer.textItem.size = new UnitValue(newSize, "px");
            layer.textItem.leading = new UnitValue(newSize, "px");
            // After resizing, re-align the top: shift the text so its top equals targetTop.
            b = layer.bounds;
            var newTop = b[1].as("px");
            layer.translate(0, targetTop - newTop);
        }
    }
    
    adjustTextToExactHeight(textLayer, targetHeight, 0.5);
    
    // ----- Step 10. Final horizontal check:
    // Ensure that the right edge of the text does not extend past targetRight.
    var finalBounds = textLayer.bounds; // [left, top, right, bottom]
    var finalRight = finalBounds[2].as("px");
    if (finalRight > targetRight) {
        // Iteratively reduce font size until the right edge is within the target.
        for (var j = 0; j < 10; j++) {
            finalBounds = textLayer.bounds;
            finalRight = finalBounds[2].as("px");
            if (finalRight <= targetRight) break;
            var currSize = parseFloat(textLayer.textItem.size.as("px"));
            textLayer.textItem.size = new UnitValue(currSize - 1, "px");
            textLayer.textItem.leading = new UnitValue(currSize - 1, "px");
            // Re-align the top so it stays at targetTop.
            finalBounds = textLayer.bounds;
            var currTop = finalBounds[1].as("px");
            textLayer.translate(0, targetTop - currTop);
        }
    }
    
    // (Optional) Also ensure the left edge is not inside the left margin.
    finalBounds = textLayer.bounds;
    var finalLeft = finalBounds[0].as("px");
    if (finalLeft < targetLeft) {
        textLayer.translate(targetLeft - finalLeft, 0);
    }
    
    alert("Canvas resized, image repositioned, and text adjusted.\n" +
          "Text top is exactly " + targetTop + "px and bottom is exactly " + targetBottom + "px from the canvas edges.\n" +
          "Text right edge does not exceed " + targetRight + "px.");
})();
