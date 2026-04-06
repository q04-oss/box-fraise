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

  // Batch scan mode
  var batchScanMode: Bool = false
  var onBatchPrepare: (([Int]) -> Void)?
  private var batchOverlay: ARBatchScanOverlay?

  // Drop alert tap callback
  var onDropAlertTap: (() -> Void)?

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

    // Feature 4: gift reveal tap handler (skip in staff/batch mode)
    if !staffMode && !batchScanMode && isGift && !giftNote.isEmpty {
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

    // Batch scan overlay
    if batchScanMode {
      let overlay = ARBatchScanOverlay()
      overlay.translatesAutoresizingMaskIntoConstraints = false
      overlay.onBulkPrepare = { [weak self] ids in
        self?.onBatchPrepare?(ids)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
          self?.batchOverlay?.markDone()
        }
      }
      overlay.onDone = { [weak self] in self?.handleDismiss() }
      view.addSubview(overlay)
      NSLayoutConstraint.activate([
        overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
        overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        overlay.heightAnchor.constraint(equalToConstant: 300),
      ])
      batchOverlay = overlay
    }

    // ── New AR enrichment overlays (user mode only) ──
    if !staffMode && !marketStallMode && !batchScanMode {
      let name = (varietyData["variety_name"] as? String) ?? "Strawberry"

      // Freshness ring (always shown when harvest_date present)
      let harvestDate = varietyData["harvest_date"] as? String
      if harvestDate != nil {
        setupFreshnessRing(harvestDate: harvestDate)
      }

      // Flavor wheel + pairing card (when flavor_profile present)
      if let profile = varietyData["flavor_profile"] as? NSDictionary {
        setupFlavorWheel(profile: profile)
        let pairingChoc = profile["pairing_chocolate"] as? String ?? ""
        let pairingFinish = profile["pairing_finish"] as? String ?? ""
        if !pairingChoc.isEmpty || !pairingFinish.isEmpty {
          let display = [pairingChoc, pairingFinish].filter { !$0.isEmpty }.joined(separator: " · ")
          setupPairingCard(chocolate: pairingChoc, finish: pairingFinish, varietyName: name)
        }
      }

      // Collectif avatars (screen-space, when names present)
      let collectifNames = varietyData["collectif_member_names"] as? [String] ?? []
      if !collectifNames.isEmpty {
        setupCollectifAvatarsOverlay(names: collectifNames)
      }

      // Seasonal timeline (when season data present)
      let seasonStart = varietyData["season_start"] as? String
      let seasonEnd = varietyData["season_end"] as? String
      if seasonStart != nil || seasonEnd != nil {
        setupSeasonalTimeline(start: seasonStart, end: seasonEnd, varietyName: name)
      }

      // Farm arc (when farm_distance_km present)
      if let distKm = varietyData["farm_distance_km"] as? NSNumber, distKm.doubleValue > 0 {
        setupFarmArc(distanceKm: CGFloat(distKm.doubleValue))
      }

      // Passport stamp (first-time collection)
      let orderCount = (varietyData["order_count"] as? NSNumber)?.intValue ?? 0
      if orderCount == 1 {
        setupPassportStamp(varietyName: name)
      }

      // Drop alert banner (screen-space)
      if let drop = varietyData["active_drop"] as? NSDictionary {
        let dropTitle = (drop["title"] as? String) ?? (drop["name"] as? String) ?? "This variety"
        let priceCents = (drop["price_cents"] as? NSNumber)?.intValue ?? 0
        setupDropAlertOverlay(title: dropTitle, priceCents: priceCents)
      }
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

  // MARK: - New enrichment setups

  private func setupFreshnessRing(harvestDate: String?) {
    let size = CGSize(width: 110, height: 130)
    let ringView = ARFreshnessRingView(harvestDateISO: harvestDate)
    ringView.frame = CGRect(origin: .zero, size: size)
    ringView.layoutIfNeeded()
    let image = renderView(ringView, size: size)

    let plane = SCNPlane(width: 0.09, height: 0.105)
    plane.materials = [makeMaterial(image: image)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0.22, 0.14, -0.55)
    node.constraints = [makeBillboard()]
    sceneView.scene.rootNode.addChildNode(node)
  }

  private func setupFlavorWheel(profile: NSDictionary) {
    let s = CGFloat((profile["sweetness"] as? NSNumber)?.doubleValue ?? 5)
    let a = CGFloat((profile["acidity"] as? NSNumber)?.doubleValue ?? 5)
    let ar = CGFloat((profile["aroma"] as? NSNumber)?.doubleValue ?? 5)
    let t = CGFloat((profile["texture"] as? NSNumber)?.doubleValue ?? 5)
    let i = CGFloat((profile["intensity"] as? NSNumber)?.doubleValue ?? 5)
    let pairing = (profile["pairing_chocolate"] as? String).flatMap { choc -> String? in
      let finish = profile["pairing_finish"] as? String ?? ""
      return [choc, finish].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    let size = CGSize(width: 360, height: 220)
    let wheelView = ARFlavorWheelView(sweetness: s, acidity: a, aroma: ar, texture: t, intensity: i, pairingText: pairing)
    wheelView.frame = CGRect(origin: .zero, size: size)
    wheelView.layoutIfNeeded()
    let image = renderView(wheelView, size: size)

    let plane = SCNPlane(width: 0.28, height: 0.17)
    plane.materials = [makeMaterial(image: image)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0.0, 0.24, -0.60)
    node.constraints = [makeBillboard()]
    sceneView.scene.rootNode.addChildNode(node)
  }

  private func setupPairingCard(chocolate: String, finish: String, varietyName: String) {
    let size = CGSize(width: 240, height: 120)
    let cardView = ARPairingCardView(chocolate: chocolate, finish: finish, varietyName: varietyName)
    cardView.frame = CGRect(origin: .zero, size: size)
    cardView.layoutIfNeeded()
    let image = renderView(cardView, size: size)

    let plane = SCNPlane(width: 0.19, height: 0.095)
    plane.materials = [makeMaterial(image: image)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0.0, -0.17, -0.55)
    node.constraints = [makeBillboard()]
    sceneView.scene.rootNode.addChildNode(node)
  }

  private func setupCollectifAvatarsOverlay(names: [String]) {
    let avatarView = ARCollectifAvatarsView(names: names)
    avatarView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(avatarView)
    NSLayoutConstraint.activate([
      avatarView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
      avatarView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -80),
    ])
  }

  private func setupSeasonalTimeline(start: String?, end: String?, varietyName: String) {
    let size = CGSize(width: 420, height: 80)
    let timelineView = ARSeasonalTimelineView(seasonStart: start, seasonEnd: end, varietyName: varietyName)
    timelineView.frame = CGRect(origin: .zero, size: size)
    timelineView.layoutIfNeeded()
    let image = renderView(timelineView, size: size)

    let plane = SCNPlane(width: 0.32, height: 0.062)
    plane.materials = [makeMaterial(image: image)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0.0, -0.27, -0.58)
    node.constraints = [makeBillboard()]
    sceneView.scene.rootNode.addChildNode(node)
  }

  private func setupFarmArc(distanceKm: CGFloat) {
    // Stylised arc from origin towards the scene horizon
    // Build as a series of SCNSphere nodes along a bezier curve
    let steps = 12
    let arcHeight: Float = 0.12
    let arcDepth: Float = 0.30
    let startZ: Float = -0.50
    let endZ: Float = -0.80

    for i in 0...steps {
      let t = Float(i) / Float(steps)
      // Bezier: flat at ends, peaks at midpoint
      let x: Float = 0
      let y: Float = arcHeight * sin(Float.pi * t)
      let z: Float = startZ + (endZ - startZ) * t

      let radius: CGFloat = i == 0 || i == steps ? 0.004 : 0.002
      let sphere = SCNSphere(radius: radius)
      let mat = SCNMaterial()
      mat.diffuse.contents = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: CGFloat(1 - t * 0.5))
      sphere.materials = [mat]
      let node = SCNNode(geometry: sphere)
      node.position = SCNVector3(x, y, z)
      sceneView.scene.rootNode.addChildNode(node)
    }

    // Distance label at arc peak
    let distLabel = "\(Int(distanceKm)) km from farm"
    let text = SCNText(string: distLabel, extrusionDepth: 0.001)
    text.font = UIFont.monospacedSystemFont(ofSize: 4, weight: .medium)
    text.firstMaterial?.diffuse.contents = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 0.9)
    let textNode = SCNNode(geometry: text)
    textNode.position = SCNVector3(-0.05, arcHeight + 0.015, (startZ + endZ) / 2)
    textNode.scale = SCNVector3(0.004, 0.004, 0.004)
    let billboard = SCNBillboardConstraint()
    billboard.freeAxes = .all
    textNode.constraints = [billboard]
    sceneView.scene.rootNode.addChildNode(textNode)
  }

  private func setupPassportStamp(varietyName: String) {
    let stamp = ARPassportStampView(varietyName: varietyName)
    stamp.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stamp)
    NSLayoutConstraint.activate([
      stamp.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      stamp.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      stamp.widthAnchor.constraint(equalToConstant: 220),
      stamp.heightAnchor.constraint(equalToConstant: 220),
    ])
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
      stamp.animateAndRemove()
    }
  }

  private func setupDropAlertOverlay(title: String, priceCents: Int) {
    let alertView = ARDropAlertView(dropTitle: title, priceCents: priceCents) { [weak self] in
      self?.handleDismiss()
      self?.onDropAlertTap?()
    }
    alertView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(alertView)
    NSLayoutConstraint.activate([
      alertView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
      alertView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      alertView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
    ])
    alertView.animateIn()
  }

  // MARK: - Batch scan

  /// Called when a new NFC token is scanned in batch mode.
  func addBatchOrder(id: Int, variety: String, qty: Int) {
    batchOverlay?.addOrder(id: id, variety: variety, qty: qty)
  }

  // MARK: - Helpers

  private func renderView(_ view: UIView, size: CGSize) -> UIImage {
    let renderer = UIGraphicsImageRenderer(size: size)
    return renderer.image { ctx in view.layer.render(in: ctx.cgContext) }
  }

  private func makeMaterial(image: UIImage) -> SCNMaterial {
    let mat = SCNMaterial()
    mat.diffuse.contents = image
    mat.isDoubleSided = true
    return mat
  }

  private func makeBillboard() -> SCNBillboardConstraint {
    let b = SCNBillboardConstraint()
    b.freeAxes = .Y
    return b
  }

  // MARK: - Existing card setups (unchanged)

  private func setupCard() {
    if marketStallMode {
      setupMarketStallCard()
      return
    }
    if staffMode, let sd = staffData {
      setupStaffCard(staffData: sd)
      return
    }
    if batchScanMode { return } // batch mode has no main card

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
    let vendorTagsRaw: String?
    if let tagsArray = varietyData["vendor_tags"] as? [String] {
      vendorTagsRaw = tagsArray.joined(separator: ",")
    } else {
      vendorTagsRaw = varietyData["vendor_tags"] as? String
    }

    isGift = (varietyData["is_gift"] as? NSNumber)?.boolValue ?? false
    giftNote = (varietyData["gift_note"] as? String) ?? ""
    let standingOrderLabel = varietyData["next_standing_order_label"] as? String

    let cardView = ARCardView(
      name: name, farm: farm, harvestDate: harvestDate, quantity: quantity,
      chocolate: chocolate, finish: finish, vitaminCMg: vitaminCMg,
      caloriesTodayKcal: caloriesTodayKcal, collectifPickupsToday: collectifPickupsToday,
      collectifMemberNames: collectifMemberNamesRaw, orderCount: orderCount,
      cardType: cardType, vendorDescription: vendorDescription,
      vendorTags: vendorTagsRaw, standingOrderLabel: standingOrderLabel
    )
    cardView.frame = CGRect(x: 0, y: 0, width: 480, height: 320)
    cardView.layoutIfNeeded()
    let cardImage = renderView(cardView, size: CGSize(width: 480, height: 320))

    let plane = SCNPlane(width: 0.30, height: 0.20)
    plane.materials = [makeMaterial(image: cardImage)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)
    node.constraints = [makeBillboard()]
    if isGift && !giftNote.isEmpty { node.opacity = 0 }
    cardNode = node
    sceneView.scene.rootNode.addChildNode(node)

    if let lastVariety = varietyData["last_variety"] as? NSDictionary {
      setupLastVarietyCard(lastVariety: lastVariety)
    }
  }

  private func setupLastVarietyCard(lastVariety: NSDictionary) {
    let lastName = (lastVariety["name"] as? String) ?? ""
    let lastFarm = (lastVariety["farm"] as? String) ?? ""
    let lastHarvest = (lastVariety["harvest_date"] as? String) ?? ""
    guard !lastName.isEmpty else { return }

    let lastCardView = ARCardView(
      name: lastName, farm: lastFarm, harvestDate: lastHarvest, quantity: 0,
      chocolate: "", finish: "", vitaminCMg: nil, caloriesTodayKcal: nil,
      collectifPickupsToday: nil, collectifMemberNames: [], orderCount: nil,
      cardType: "variety", vendorDescription: nil, vendorTags: nil, standingOrderLabel: nil
    )
    lastCardView.frame = CGRect(x: 0, y: 0, width: 480, height: 320)
    lastCardView.layoutIfNeeded()
    let cardImage = renderView(lastCardView, size: CGSize(width: 480, height: 320))

    let plane = SCNPlane(width: 0.30, height: 0.20)
    let mat = SCNMaterial()
    mat.diffuse.contents = cardImage
    mat.diffuse.intensity = 0.55
    mat.isDoubleSided = true
    plane.materials = [mat]

    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(-0.22, 0.05, -0.65)
    node.opacity = 0.55
    node.constraints = [makeBillboard()]

    let lastTimeText = SCNText(string: "LAST TIME", extrusionDepth: 0.001)
    lastTimeText.font = UIFont.monospacedSystemFont(ofSize: 4, weight: .medium)
    lastTimeText.firstMaterial?.diffuse.contents = UIColor.white.withAlphaComponent(0.7)
    let labelNode = SCNNode(geometry: lastTimeText)
    labelNode.position = SCNVector3(-0.22, 0.17, -0.65)
    labelNode.scale = SCNVector3(0.004, 0.004, 0.004)

    sceneView.scene.rootNode.addChildNode(node)
    sceneView.scene.rootNode.addChildNode(labelNode)
  }

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
    let cardImage = renderView(cardView, size: CGSize(width: 480, height: 240))
    let plane = SCNPlane(width: 0.30, height: 0.15)
    plane.materials = [makeMaterial(image: cardImage)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)
    node.constraints = [makeBillboard()]
    cardNode = node
    sceneView.scene.rootNode.addChildNode(node)
  }

  private func setupMarketStallCard() {
    let stallCardView = ARMarketStallCardView(stallData: varietyData)
    stallCardView.frame = CGRect(x: 0, y: 0, width: 480, height: 360)
    stallCardView.layoutIfNeeded()
    let cardImage = renderView(stallCardView, size: CGSize(width: 480, height: 360))

    let plane = SCNPlane(width: 0.30, height: 0.225)
    plane.materials = [makeMaterial(image: cardImage)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)
    node.constraints = [makeBillboard()]
    cardNode = node
    sceneView.scene.rootNode.addChildNode(node)
  }

  // MARK: - Feature 4: Gift reveal

  private func setupGiftCard() {
    let giftView = ARGiftCardView(note: giftNote)
    giftView.frame = CGRect(x: 0, y: 0, width: 480, height: 280)
    giftView.layoutIfNeeded()
    let giftImage = renderView(giftView, size: CGSize(width: 480, height: 280))

    let plane = SCNPlane(width: 0.30, height: 0.175)
    plane.materials = [makeMaterial(image: giftImage)]
    let node = SCNNode(geometry: plane)
    node.position = SCNVector3(0, 0, -0.55)
    node.constraints = [makeBillboard()]
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
    let interval: TimeInterval = (marketStallMode || batchScanMode) ? 120 : 30
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
