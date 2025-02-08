// ===== AutoResizePlaceAndText_AdjustedText.jsx =====
// This script:
// 1. Sets Photoshop’s background to black.
// 2. Resizes the canvas to 3× the original width (anchored at TOPLEFT).
// 3. Moves the image layer so its top‑left is at (0,0) and fills the extra area with black.
// 4. Prompts you to paste your multi‑paragraph ChatGPT output (converting newlines to carriage returns).
// 5. Creates a point text layer (without a fixed text box).
// 6. Adjusts the text’s font size so that the text’s bounding box fits within a target rectangle
//    in the visible black area. The target rectangle has margins defined as follows:
//       • Top margin: 0.025 × document height
//       • Left margin: 0.025 × (visible black area’s width)
//       • Right margin: same as left; Bottom margin: same as top.
(function() {
    // --- Step 1. Set Photoshop's background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;
    blackColor.rgb.green = 0;
    blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;
    
    // --- Step 2. Get the active document and its dimensions.
    var doc = app.activeDocument;
    var origWidth = doc.width.as("px");
    var origHeight = doc.height.as("px");
    
    // --- Step 3. Resize the canvas: new width = 3× original width; height remains unchanged.
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);
    
    // --- Step 4. Process the image layer.
    // If the active layer is locked (background), duplicate it to allow moving.
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
    
    // --- Step 7. Define the target rectangle within the visible black area.
    // The visible black area is the right 2×origWidth of the canvas.
    // Let:
    //   • marginVert = 0.025 × origHeight
    //   • marginHoriz = 0.025 × (visible black area’s width) = 0.025 × (2×origWidth) = 0.05×origWidth.
    var marginVert = 0.025 * origHeight;
    var marginHoriz = 0.05 * origWidth;
    // The visible black area's left edge is at x = origWidth and its right edge at x = 3×origWidth.
    var targetLeft = origWidth + marginHoriz;
    var targetTop = marginVert;
    var targetRight = (3 * origWidth) - marginHoriz;
    var targetBottom = origHeight - marginVert;
    var targetWidth = targetRight - targetLeft;   // = (3*origWidth - marginHoriz) - (origWidth + marginHoriz) = 2*origWidth - 2*marginHoriz.
    var targetHeight = targetBottom - targetTop;    // = origHeight - 2*marginVert.
    
    // --- Step 8. Create a new point text layer (no fixed text box).
    // (Point text will respect carriage returns for line breaks.)
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    // Create point text by not specifying a bounding box.
    textLayer.textItem.kind = TextType.POINTTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    textLayer.textItem.font = "ArialMT";              // Change to desired font.
    textLayer.textItem.size = new UnitValue(24, "px");    // Start with a default size.
    textLayer.textItem.autoLeading = false;
    textLayer.textItem.leading = new UnitValue(24, "px");
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // By default, point text's "position" property sets the insertion point.
    // We'll position the text such that its bounding box (as measured by layer.bounds) is shifted
    // so that its top-left corner aligns with (targetLeft, targetTop).
    
    // --- Step 9. Adjust the text size to fit within the target rectangle.
    // First, force the text layer to update its bounds.
    var currentBounds = textLayer.bounds;
    var currentWidth = currentBounds[2].as("px") - currentBounds[0].as("px");
    var currentHeight = currentBounds[3].as("px") - currentBounds[1].as("px");
    
    // Compute scale factors required for width and height.
    var scaleFactorW = targetWidth / currentWidth;
    var scaleFactorH = targetHeight / currentHeight;
    var scaleFactor = Math.min(scaleFactorW, scaleFactorH);
    
    // Get the current font size and compute the new font size.
    var currentFontSize = parseFloat(textLayer.textItem.size.as("px"));
    var newFontSize = currentFontSize * scaleFactor;
    
    // Set the new font size and matching leading.
    textLayer.textItem.size = new UnitValue(newFontSize, "px");
    textLayer.textItem.leading = new UnitValue(newFontSize, "px");
    
    // Re-measure bounds.
    currentBounds = textLayer.bounds;
    // Calculate how much to shift the text so that its top-left aligns with the target.
    var currentLeft = currentBounds[0].as("px");
    var currentTop = currentBounds[1].as("px");
    var dx = targetLeft - currentLeft;
    var dy = targetTop - currentTop;
    textLayer.translate(dx, dy);
    
    // --- (Optional) Final check: if the bottom of the text is not at least targetBottom,
    // you might decide to reduce the font size slightly. (Here we simply alert the user.)
    currentBounds = textLayer.bounds;
    var currentBottom = currentBounds[3].as("px");
    if (currentBottom > targetBottom) {
        alert("Warning: The text overflows the target bottom margin.");
    }
    
    alert("Canvas resized, image repositioned, and text adjusted.\n" +
          "Text top is at " + targetTop + "px and left is at " + targetLeft + "px.\n" +
          "Target area: " + targetWidth + "px wide by " + targetHeight + "px high.");
})();
