import UIKit
import ARKit
import SceneKit

class ARBoxViewController: UIViewController, ARSCNViewDelegate {

  private let sceneView = ARSCNView()
  private let varietyData: NSDictionary
  private let onDismiss: () -> Void
  private var dismissTimer: Timer?

  // Feature 4: Gift reveal state
  private var isGift: Bool = false
  private var giftNote: String = ""
  private var giftCardNode: SCNNode?
  private var cardNode: SCNNode?
  private var hasRevealedGift = false

  // Feature E: Staff mode
  var staffMode: Bool = false
  var staffData: NSDictionary?
  private var staffOverlay: ARStaffOverlay?
  var onStaffAction: ((String, Int) -> Void)?

  // Feature F: Market stall mode
  var marketStallMode: Bool = false

  init(varietyData: NSDictionary, onDismiss: @escaping () -> Void) {
    self.varietyData = varietyData
    self.onDismiss = onDismiss
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
    setupSceneView()
    setupCard()
    setupDismissButton()
    startAutoTimer()

    // Feature 4: gift reveal tap handler (skip in staff mode)
    if !staffMode && isGift && !giftNote.isEmpty {
      setupGiftCard()
      let tap = UITapGestureRecognizer(target: self, action: #selector(handleSceneTap))
      sceneView.addGestureRecognizer(tap)
    }

    // Feature E: show staff overlay on top of AR scene
    if staffMode, let sd = staffData {
      let overlay = ARStaffOverlay(staffData: sd) { [weak self] action in
        guard let self = self else { return }
        let orderId = (sd["id"] as? NSNumber)?.intValue ?? 0
        self.onStaffAction?(action, orderId)
        self.handleDismiss()
      }
      overlay.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(overlay)
      NSLayoutConstraint.activate([
        overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
        overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        overlay.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -80),
      ])
      staffOverlay = overlay
    }

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(appDidBackground),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    let config = ARWorldTrackingConfiguration()
    config.planeDetection = [.horizontal]
    sceneView.session.run(config)
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    sceneView.session.pause()
    dismissTimer?.invalidate()
    NotificationCenter.default.removeObserver(self)
  }

  private func setupSceneView() {
    sceneView.frame = view.bounds
    sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    sceneView.delegate = self
    sceneView.showsStatistics = false
    view.addSubview(sceneView)
  }

  private func setupCard() {
    // Feature F: market stall mode — use ARMarketStallCardView
    if marketStallMode {
      setupMarketStallCard()
      return
    }

    // Feature E: staff mode — simplified card (variety + status)
    if staffMode, let sd = staffData {
      setupStaffCard(staffData: sd)
      return
    }

    let name = (varietyData["variety_name"] as? String) ?? "Strawberry"
    let farm = (varietyData["farm"] as? String) ?? ""
    let harvestDate = (varietyData["harvest_date"] as? String) ?? ""
    let quantity = (varietyData["quantity"] as? NSNumber)?.intValue ?? 0
    let chocolate = (varietyData["chocolate"] as? String) ?? ""
    let finish = (varietyData["finish"] as? String) ?? ""
    let vitaminCMg = varietyData["vitamin_c_today_mg"] as? NSNumber
    let caloriesTodayKcal = varietyData["calories_today_kcal"] as? NSNumber
    let collectifPickupsToday = varietyData["collectif_pickups_today"] as? NSNumber
    let collectifMemberNamesRaw = varietyData["collectif_member_names"] as? [String] ?? []
    let orderCount = varietyData["order_count"] as? NSNumber
    let cardType = (varietyData["card_type"] as? String) ?? "variety"
    let vendorDescription = varietyData["vendor_description"] as? String
    // vendor_tags arrives as NSArray from the bridge; join to comma string for ARCardView
    let vendorTagsRaw: String?
    if let tagsArray = varietyData["vendor_tags"] as? [String] {
      vendorTagsRaw = tagsArray.joined(separator: ",")
    } else {
      vendorTagsRaw = varietyData["vendor_tags"] as? String
    }

    // Feature 4: extract gift fields
    isGift = (varietyData["is_gift"] as? NSNumber)?.boolValue ?? false
    giftNote = (varietyData["gift_note"] as? String) ?? ""

    // Feature C: standing order label
    let standingOrderLabel = varietyData["next_standing_order_label"] as? String

    let cardView = ARCardView(
      name: name,
      farm: farm,
      harvestDate: harvestDate,
      quantity: quantity,
      chocolate: chocolate,
      finish: finish,
      vitaminCMg: vitaminCMg,
      caloriesTodayKcal: caloriesTodayKcal,
      collectifPickupsToday: collectifPickupsToday,
      collectifMemberNames: collectifMemberNamesRaw,
      orderCount: orderCount,
      cardType: cardType,
      vendorDescription: vendorDescription,
      vendorTags: vendorTagsRaw,
      standingOrderLabel: standingOrderLabel
    )
    cardView.frame = CGRect(x: 0, y: 0, width: 480, height: 320)
    cardView.layoutIfNeeded()

    let renderer = UIGraphicsImageRenderer(size: cardView.bounds.size)
    let cardImage = renderer.image { ctx in
      cardView.layer.render(in: ctx.cgContext)
    }

    let plane = SCNPlane(width: 0.30, height: 0.20)
    let material = SCNMaterial()
    material.diffuse.contents = cardImage
    material.isDoubleSided = true
    plane.materials = [material]

    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)

    let billboard = SCNBillboardConstraint()
    billboard.freeAxes = .Y
    node.constraints = [billboard]

    // Feature 4: hide regular card if gift mode is active (revealed after tap)
    if isGift && !giftNote.isEmpty {
      node.opacity = 0
    }

    cardNode = node
    sceneView.scene.rootNode.addChildNode(node)

    // Feature B: second dimmed card for last variety comparison
    if let lastVariety = varietyData["last_variety"] as? NSDictionary {
      setupLastVarietyCard(lastVariety: lastVariety)
    }
  }

  // Feature B: second floating card showing previous variety
  private func setupLastVarietyCard(lastVariety: NSDictionary) {
    let lastName = (lastVariety["name"] as? String) ?? ""
    let lastFarm = (lastVariety["farm"] as? String) ?? ""
    let lastHarvest = (lastVariety["harvest_date"] as? String) ?? ""
    guard !lastName.isEmpty else { return }

    let lastCardView = ARCardView(
      name: lastName,
      farm: lastFarm,
      harvestDate: lastHarvest,
      quantity: 0,
      chocolate: "",
      finish: "",
      vitaminCMg: nil,
      caloriesTodayKcal: nil,
      collectifPickupsToday: nil,
      collectifMemberNames: [],
      orderCount: nil,
      cardType: "variety",
      vendorDescription: nil,
      vendorTags: nil,
      standingOrderLabel: nil
    )
    lastCardView.frame = CGRect(x: 0, y: 0, width: 480, height: 320)
    lastCardView.layoutIfNeeded()

    let renderer = UIGraphicsImageRenderer(size: lastCardView.bounds.size)
    let cardImage = renderer.image { ctx in
      lastCardView.layer.render(in: ctx.cgContext)
    }

    let plane = SCNPlane(width: 0.30, height: 0.20)
    let material = SCNMaterial()
    material.diffuse.contents = cardImage
    material.diffuse.intensity = 0.55
    material.isDoubleSided = true
    plane.materials = [material]

    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(-0.22, 0.05, -0.65)
    node.opacity = 0.55

    let billboard = SCNBillboardConstraint()
    billboard.freeAxes = .Y
    node.constraints = [billboard]

    // "LAST TIME" label above the secondary card
    let lastTimeText = SCNText(string: "LAST TIME", extrusionDepth: 0.001)
    lastTimeText.font = UIFont.monospacedSystemFont(ofSize: 4, weight: .medium)
    lastTimeText.firstMaterial?.diffuse.contents = UIColor.white.withAlphaComponent(0.7)
    let labelNode = SCNNode(geometry: lastTimeText)
    labelNode.position = SCNVector3(-0.22, 0.17, -0.65)
    labelNode.scale = SCNVector3(0.004, 0.004, 0.004)

    sceneView.scene.rootNode.addChildNode(node)
    sceneView.scene.rootNode.addChildNode(labelNode)
  }

  // Feature E: staff mode card (simplified: variety name + status)
  private func setupStaffCard(staffData: NSDictionary) {
    let varietyName = (staffData["variety_name"] as? String) ?? "Order"
    let status = (staffData["status"] as? String) ?? ""
    let quantity = (staffData["quantity"] as? NSNumber)?.intValue ?? 0

    let cardView = UIView()
    cardView.backgroundColor = UIColor(red: 0.969, green: 0.961, blue: 0.949, alpha: 0.94)
    cardView.layer.cornerRadius = 20
    cardView.layer.masksToBounds = true
    cardView.frame = CGRect(x: 0, y: 0, width: 480, height: 240)

    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = 12
    stack.layoutMargins = UIEdgeInsets(top: 20, left: 24, bottom: 20, right: 24)
    stack.isLayoutMarginsRelativeArrangement = true
    stack.translatesAutoresizingMaskIntoConstraints = false
    cardView.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: cardView.topAnchor),
      stack.leadingAnchor.constraint(equalTo: cardView.leadingAnchor),
      stack.trailingAnchor.constraint(equalTo: cardView.trailingAnchor),
      stack.bottomAnchor.constraint(equalTo: cardView.bottomAnchor),
    ])

    let nameLabel = UILabel()
    nameLabel.text = varietyName.uppercased()
    nameLabel.font = UIFont.monospacedSystemFont(ofSize: 22, weight: .semibold)
    nameLabel.textColor = UIColor(red: 0.13, green: 0.12, blue: 0.11, alpha: 1)
    stack.addArrangedSubview(nameLabel)

    let qtyLabel = UILabel()
    qtyLabel.text = "QTY \(quantity)"
    qtyLabel.font = UIFont.monospacedSystemFont(ofSize: 14, weight: .regular)
    qtyLabel.textColor = UIColor(red: 0.5, green: 0.47, blue: 0.44, alpha: 1)
    stack.addArrangedSubview(qtyLabel)

    let statusPillColor: UIColor
    switch status {
    case "paid": statusPillColor = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)
    case "preparing": statusPillColor = UIColor(red: 0.22, green: 0.75, blue: 0.35, alpha: 1)
    case "ready": statusPillColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)
    default: statusPillColor = UIColor.gray
    }
    let pill = UIView()
    pill.backgroundColor = statusPillColor
    pill.layer.cornerRadius = 12
    let pillLabel = UILabel()
    pillLabel.text = status.uppercased()
    pillLabel.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .medium)
    pillLabel.textColor = .white
    pillLabel.textAlignment = .center
    pillLabel.translatesAutoresizingMaskIntoConstraints = false
    pill.addSubview(pillLabel)
    pill.heightAnchor.constraint(equalToConstant: 44).isActive = true
    NSLayoutConstraint.activate([
      pillLabel.centerXAnchor.constraint(equalTo: pill.centerXAnchor),
      pillLabel.centerYAnchor.constraint(equalTo: pill.centerYAnchor),
    ])
    stack.addArrangedSubview(pill)

    cardView.layoutIfNeeded()
    let renderer = UIGraphicsImageRenderer(size: cardView.bounds.size)
    let cardImage = renderer.image { ctx in cardView.layer.render(in: ctx.cgContext) }

    let plane = SCNPlane(width: 0.30, height: 0.15)
    let material = SCNMaterial()
    material.diffuse.contents = cardImage
    material.isDoubleSided = true
    plane.materials = [material]

    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)

    let billboard = SCNBillboardConstraint()
    billboard.freeAxes = .Y
    node.constraints = [billboard]

    cardNode = node
    sceneView.scene.rootNode.addChildNode(node)
  }

  // Feature F: market stall card
  private func setupMarketStallCard() {
    let stallData = varietyData
    let stallCardView = ARMarketStallCardView(stallData: stallData)
    stallCardView.frame = CGRect(x: 0, y: 0, width: 480, height: 360)
    stallCardView.layoutIfNeeded()

    let renderer = UIGraphicsImageRenderer(size: stallCardView.bounds.size)
    let cardImage = renderer.image { ctx in stallCardView.layer.render(in: ctx.cgContext) }

    let plane = SCNPlane(width: 0.30, height: 0.225)
    let material = SCNMaterial()
    material.diffuse.contents = cardImage
    material.isDoubleSided = true
    plane.materials = [material]

    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)

    let billboard = SCNBillboardConstraint()
    billboard.freeAxes = .Y
    node.constraints = [billboard]

    cardNode = node
    sceneView.scene.rootNode.addChildNode(node)
  }

  // MARK: - Feature 4: Gift reveal

  private func setupGiftCard() {
    let giftView = ARGiftCardView(note: giftNote)
    giftView.frame = CGRect(x: 0, y: 0, width: 480, height: 280)
    giftView.layoutIfNeeded()

    let renderer = UIGraphicsImageRenderer(size: giftView.bounds.size)
    let giftImage = renderer.image { ctx in
      giftView.layer.render(in: ctx.cgContext)
    }

    let plane = SCNPlane(width: 0.30, height: 0.175)
    let material = SCNMaterial()
    material.diffuse.contents = giftImage
    material.isDoubleSided = true
    plane.materials = [material]

    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)

    let billboard = SCNBillboardConstraint()
    billboard.freeAxes = .Y
    node.constraints = [billboard]

    giftCardNode = node
    sceneView.scene.rootNode.addChildNode(node)
  }

  @objc private func handleSceneTap() {
    guard !hasRevealedGift else { return }
    hasRevealedGift = true
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      SCNTransaction.begin()
      SCNTransaction.animationDuration = 0.4
      self.giftCardNode?.opacity = 0
      self.cardNode?.opacity = 1
      SCNTransaction.commit()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        self?.giftCardNode?.removeFromParentNode()
      }
    }
  }

  // MARK: - UI setup

  private func setupDismissButton() {
    let btn = UIButton(type: .system)
    btn.setTitle("Done", for: .normal)
    btn.titleLabel?.font = UIFont.monospacedSystemFont(ofSize: 16, weight: .medium)
    btn.setTitleColor(.white, for: .normal)
    btn.backgroundColor = UIColor.black.withAlphaComponent(0.55)
    btn.layer.cornerRadius = 20
    btn.contentEdgeInsets = UIEdgeInsets(top: 10, left: 28, bottom: 10, right: 28)
    btn.translatesAutoresizingMaskIntoConstraints = false
    btn.addTarget(self, action: #selector(handleDismiss), for: .touchUpInside)
    view.addSubview(btn)
    NSLayoutConstraint.activate([
      btn.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      btn.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
    ])
  }

  private func startAutoTimer() {
    let interval: TimeInterval = marketStallMode ? 45 : 30
    dismissTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
      self?.handleDismiss()
    }
  }

  @objc private func handleDismiss() {
    dismissTimer?.invalidate()
    dismiss(animated: true) { [weak self] in
      self?.onDismiss()
    }
  }

  @objc private func appDidBackground() {
    sceneView.session.pause()
  }
}
