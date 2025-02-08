// ===== AutoResizePlaceAndTextMultiParagraph_FillTextBox_Simple.jsx =====
// This script:
// 1. Sets the background to black.
// 2. Resizes the canvas to 3× the original width.
// 3. Moves the image layer to the top-left.
// 4. Fills the extra area with black.
// 5. Displays a ScriptUI dialog to paste multi‑paragraph ChatGPT output.
// 6. Creates a text box in the extra (black) area using dynamic margins.
// 7. Adjusts the text size (with fixed leading) so that the rendered text nearly fills the text box vertically.
(function() {
    // --- Step 1. Set the background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;  blackColor.rgb.green = 0;  blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;
    
    // --- Step 2. Get document dimensions.
    var doc = app.activeDocument;
    var origWidth = doc.width.as("px");
    var origHeight = doc.height.as("px");
    
    // --- Step 3. Resize the canvas: new width = 3 × original width.
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);
    
    // --- Step 4. Process the image layer.
    // If the active layer is locked (background), duplicate it so we can move it.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }
    var bounds = imageLayer.bounds; // [left, top, right, bottom]
    var deltaX = -bounds[0].as("px");
    var deltaY = -bounds[1].as("px");
    imageLayer.translate(deltaX, deltaY);
    
    // --- Step 5. Fill the extended canvas area with black.
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    doc.selection.selectAll();
    doc.selection.fill(blackColor);
    doc.selection.deselect();
    bgLayer.move(doc, ElementPlacement.PLACEATEND);
    
    // --- Step 6. Get ChatGPT conversation output via a custom multiline ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300]; // Adjust size as needed.
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
        // Replace newline characters (\n) with carriage returns (\r) so that Photoshop treats them as paragraph breaks.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }
    
    // --- Step 7. Create a text box in the visible (black) area.
    // The extra (black) area is the right 2×origWidth of the canvas.
    // Define margins:
    //    Vertical margin = 0.025 × origHeight
    //    Horizontal margin = 0.025 × (2 × origWidth)
    var marginVert = 0.025 * origHeight;
    var marginHoriz = 0.025 * (2 * origWidth);
    var textX = origWidth + marginHoriz;                // X position within black area.
    var textY = marginVert;                             // Y position from the top.
    var textWidth = (2 * origWidth) - (2 * marginHoriz);  // Available width.
    var textHeight = origHeight - (2 * marginVert);       // Available height.
    
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
    textLayer.textItem.width = new UnitValue(textWidth, "px");
    textLayer.textItem.height = new UnitValue(textHeight, "px");
    
    // Set initial text formatting.
    textLayer.textItem.font = "ArialMT";  // Change if desired.
    textLayer.textItem.size = new UnitValue(24, "px");  // Starting font size.
    textLayer.textItem.autoLeading = false;  // Disable auto‑leading.
    textLayer.textItem.leading = new UnitValue(24, "px");  // Set leading equal to font size.
    var textColor = new SolidColor();
    textColor.rgb.red = 255;  textColor.rgb.green = 255;  textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // --- Step 8. Adjust text size to fill the text box vertically.
    // This function calculates a scale factor based on the ratio of the target height
    // to the currently rendered text height and then applies small adjustments.
    function adjustTextSizeSimple(layer, targetHeight) {
        // Get the current rendered height.
        var b = layer.bounds;
        var renderedHeight = b[3].as("px") - b[1].as("px");
        if (renderedHeight < 1) return; // avoid division by zero
        
        var currentSize = parseFloat(layer.textItem.size.as("px"));
        // Compute scale factor.
        var scaleFactor = targetHeight / renderedHeight;
        var newSize = currentSize * scaleFactor;
        // Set new font size and leading.
        layer.textItem.size = new UnitValue(newSize, "px");
        layer.textItem.leading = new UnitValue(newSize, "px");
        
        // Re-measure rendered height.
        b = layer.bounds;
        renderedHeight = b[3].as("px") - b[1].as("px");
        
        // If overshooting the target, reduce font size in small steps.
        if (renderedHeight > targetHeight) {
            while (renderedHeight > targetHeight && newSize > 1) {
                newSize -= 0.5;
                layer.textItem.size = new UnitValue(newSize, "px");
                layer.textItem.leading = new UnitValue(newSize, "px");
                b = layer.bounds;
                renderedHeight = b[3].as("px") - b[1].as("px");
            }
        } else {
            // If there is still a gap, try increasing in small steps.
            while (renderedHeight < targetHeight * 0.98) {
                newSize += 0.5;
                layer.textItem.size = new UnitValue(newSize, "px");
                layer.textItem.leading = new UnitValue(newSize, "px");
                b = layer.bounds;
                renderedHeight = b[3].as("px") - b[1].as("px");
                if (renderedHeight > targetHeight) {
                    // If we overshoot, revert a bit.
                    newSize -= 0.5;
                    layer.textItem.size = new UnitValue(newSize, "px");
                    layer.textItem.leading = new UnitValue(newSize, "px");
                    break;
                }
            }
        }
    }
    
    adjustTextSizeSimple(textLayer, textHeight);
    
    // Final horizontal overflow check: if the text's width exceeds the text box width, reduce font size slightly.
    var finalBounds = textLayer.bounds;
    var finalRenderedWidth = finalBounds[2].as("px") - finalBounds[0].as("px");
    if (finalRenderedWidth > textWidth) {
        var currentSize = parseFloat(textLayer.textItem.size.as("px"));
        textLayer.textItem.size = new UnitValue(currentSize - 1, "px");
        textLayer.textItem.leading = new UnitValue(currentSize - 1, "px");
    }
    
    alert("Canvas resized, image repositioned, and text box adjusted to fill vertically!");
})();
