// ===== AutoResizePlaceAndTextMultiParagraph_SmartObjectFit.jsx =====
// This script does the following:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at the top-left).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Displays a custom multiline ScriptUI dialog to paste your ChatGPT output.
// 7. Replaces newline characters with carriage returns (so Photoshop shows multiple paragraphs).
// 8. Creates a text box in the visible black area with dynamic margins.
// 9. Converts the text layer to a Smart Object and then applies a free transform scale so that
//    the entire text exactly fits inside the text box (ensuring all text is visible and as big as possible).
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
    // New canvas: width = 3×original width; height remains the same.
    // Anchor at TOPLEFT so the image remains at the top-left.
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

    // ---------- Step 4. Process the image layer.
    // If the active layer is a background (locked) layer, duplicate it so it can be moved.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }
    // Move the image layer so its top-left corner is at (0,0).
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

    // ---------- Step 6. Get ChatGPT conversation output via a custom multiline ScriptUI dialog.
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
        // Replace newline characters with carriage returns so Photoshop treats them as paragraph breaks.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }

    // ---------- Step 7. Create a text box with dynamic margins in the visible (black) area.
    // The visible (black) area is the right 2× the original width of the canvas.
    // Define margins:
    //    Vertical margin = 0.025 × origHeight
    //    Horizontal margin = 0.025 × (2 × origWidth)
    var marginVert = 0.025 * origHeight;
    var marginHoriz = 0.025 * (2 * origWidth);
    var textX = origWidth + marginHoriz;                // X position inside the black area.
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

    // ---------- Set text formatting.
    // (Here you can leave the font settings as desired; this example uses your previously requested values.)
    textLayer.textItem.font = "Helvetica-BoldOblique"; // Using your last requested font.
    textLayer.textItem.size = new UnitValue(60, "px");
    try {
        textLayer.textItem.antiAliasMethod = AntiAlias.SHARP;
    } catch (e) {
        try {
            textLayer.textItem.antiAliasMethod = "Sharp";
        } catch(e2) {
            // If setting fails, it remains unchanged.
        }
    }
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;

    // ---------- Step 8. Convert the text layer to a Smart Object so we can scale it uniformly.
    // This method scales the entire layer so that it exactly fits inside the text box.
    // (It preserves the original text for editing.)
    doc.activeLayer = textLayer;
    // Execute the "new smart object via copy" command.
    var idnewPlacedLayer = stringIDToTypeID("newPlacedLayer");
    executeAction(idnewPlacedLayer, undefined, DialogModes.NO);

    // Now, the active layer is the Smart Object. Get its bounds.
    var smartBounds = doc.activeLayer.bounds; // [left, top, right, bottom]
    var smartWidth = smartBounds[2].as("px") - smartBounds[0].as("px");
    var smartHeight = smartBounds[3].as("px") - smartBounds[1].as("px");

    // Compute the scaling factors needed to exactly fit the text inside the text box.
    var scaleX = (textWidth / smartWidth) * 100; // as a percentage
    var scaleY = (textHeight / smartHeight) * 100; // as a percentage
    // Use the smaller scale factor to maintain aspect ratio.
    var scaleFactor = Math.min(scaleX, scaleY);

    // Apply the scale transformation uniformly.
    var idTrnf = charIDToTypeID("Trnf");
    var desc = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref = new ActionReference();
    var idLyr = charIDToTypeID("Lyr ");
    ref.putIdentifier(idLyr, doc.activeLayer.id);
    desc.putReference(idnull, ref);
    var idFTcs = charIDToTypeID("FTcs");
    var idQCSt = charIDToTypeID("QCSt");
    var idQcsZero = charIDToTypeID("Qcs0"); // reference point: top-left
    desc.putEnumerated(idFTcs, idQCSt, idQcsZero);
    var idOfst = charIDToTypeID("Ofst");
    var descOffset = new ActionDescriptor();
    // No offset needed because our text was already positioned correctly.
    desc.putObject(idOfst, idOfst, descOffset);
    // Set scale percentage.
    var idScl = charIDToTypeID("Scl ");
    desc.putUnitDouble(idScl, charIDToTypeID("#Prc"), scaleFactor);
    executeAction(idTrnf, desc, DialogModes.NO);

    alert("Canvas resized, image repositioned, and text box adjusted via Smart Object scaling so that all text is visible and as big as possible.");
})();
