// ===== AutoResizePlaceAndTextMultiParagraph_FillTextBox_BinarySearch.jsx =====
// This script does the following:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at TOPLEFT).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Displays a custom ScriptUI dialog to paste your ChatGPT output (with multiple paragraphs).
// 7. Replaces newline characters with carriage returns so Photoshop shows separate paragraphs.
// 8. Creates a text box in the visible (black) area using dynamic margins.
// 9. Uses binary search to adjust the text’s font size and then its leading so that the text nearly fills the text box vertically without overflowing.

(function() {
    // ---------- Step 1. Set Photoshop's background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;
    blackColor.rgb.green = 0;
    blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;
    
    // ---------- Step 2. Get the active document and its dimensions.
    var doc = app.activeDocument;
    var origWidth = doc.width.as("px");
    var origHeight = doc.height.as("px");
    
    // ---------- Step 3. Resize the canvas.
    // New canvas: width = 3 × original width; height remains the same.
    // Anchor at TOPLEFT so the image remains in the upper-left.
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);
    
    // ---------- Step 4. Process the image layer.
    // If the active layer is locked (background), duplicate it to allow moving.
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
    
    // ---------- Step 5. Fill the extended canvas area with black.
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    doc.selection.selectAll();
    doc.selection.fill(blackColor);
    doc.selection.deselect();
    bgLayer.move(doc, ElementPlacement.PLACEATEND);
    
    // ---------- Step 6. Get ChatGPT conversation output via a multiline ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300]; // Adjust as needed
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
    
    // ---------- Step 7. Create a text box in the visible (black) area.
    // The visible black area is the right 2×origWidth of the canvas.
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
    textLayer.textItem.font = "ArialMT"; // Change to your desired font.
    textLayer.textItem.size = new UnitValue(24, "px"); // Starting font size.
    // Disable auto‑leading and set fixed leading equal to the initial font size.
    textLayer.textItem.autoLeading = false;
    textLayer.textItem.leading = new UnitValue(24, "px");
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // ---------- Step 8. Define helper functions that use binary search for faster adjustment.
    
    // Find the maximum font size (with leading equal to the font size) that fits within boxHeight.
    function findMaxFontSize(layer, boxHeight) {
        var low = parseFloat(layer.textItem.size.as("px"));
        var high = low * 2;
        // Increase high until the rendered text overflows or we reach a safe upper bound.
        while (true) {
            layer.textItem.size = new UnitValue(high, "px");
            layer.textItem.leading = new UnitValue(high, "px");
            var b = layer.bounds;
            var renderedHeight = b[3].as("px") - b[1].as("px");
            if (renderedHeight > boxHeight || high > 2000) {
                break;
            }
            high *= 2;
        }
        var bestSize = low;
        for (var i = 0; i < 20; i++) {
            if (high - low < 1) { break; }
            var mid = (low + high) / 2;
            layer.textItem.size = new UnitValue(mid, "px");
            layer.textItem.leading = new UnitValue(mid, "px");
            var b = layer.bounds;
            var renderedHeight = b[3].as("px") - b[1].as("px");
            if (renderedHeight <= boxHeight) {
                bestSize = mid;
                low = mid;
            } else {
                high = mid;
            }
        }
        // Set the layer to the best found font size.
        layer.textItem.size = new UnitValue(bestSize, "px");
        layer.textItem.leading = new UnitValue(bestSize, "px");
        return bestSize;
    }
    
    // Find the maximum leading (line spacing) value (starting from current font size)
    // that still keeps the rendered text height within boxHeight.
    function findOptimalLeading(layer, boxHeight) {
        var low = parseFloat(layer.textItem.leading.as("px"));
        var high = low * 2;
        while (true) {
            layer.textItem.leading = new UnitValue(high, "px");
            var renderedHeight = layer.bounds[3].as("px") - layer.bounds[1].as("px");
            if (renderedHeight > boxHeight || high > 2000) {
                break;
            }
            high *= 2;
        }
        var bestLeading = low;
        for (var i = 0; i < 20; i++) {
            if (high - low < 0.5) { break; }
            var mid = (low + high) / 2;
            layer.textItem.leading = new UnitValue(mid, "px");
            var renderedHeight = layer.bounds[3].as("px") - layer.bounds[1].as("px");
            if (renderedHeight <= boxHeight) {
                bestLeading = mid;
                low = mid;
            } else {
                high = mid;
            }
        }
        layer.textItem.leading = new UnitValue(bestLeading, "px");
        return bestLeading;
    }
    
    // ---------- Step 9. Adjust the text to fill the text box vertically.
    function adjustTextToFill(layer, boxHeight) {
        // First, find the maximum font size that fits.
        findMaxFontSize(layer, boxHeight);
        // Then, fine-tune the leading.
        findOptimalLeading(layer, boxHeight);
    }
    
    // Adjust the text layer so that its rendered height nearly fills textHeight.
    adjustTextToFill(textLayer, textHeight);
    
    // Final horizontal overflow check: if the rendered width exceeds the box, reduce font size slightly.
    var finalBounds = textLayer.bounds;
    var finalRenderedWidth = finalBounds[2].as("px") - finalBounds[0].as("px");
    if (finalRenderedWidth > textWidth) {
        var currentSize = parseFloat(textLayer.textItem.size.as("px"));
        textLayer.textItem.size = new UnitValue(currentSize - 1, "px");
        textLayer.textItem.leading = new UnitValue(currentSize - 1, "px");
    }
    
    alert("Canvas resized, image repositioned, and text box adjusted to fill vertically!");
})();
