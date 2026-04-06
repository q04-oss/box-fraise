import UIKit

/// Staff batch scan overlay: accumulates scanned order IDs and shows a bulk-prepare CTA.
/// Add as UIKit subview over the AR scene in staff batch mode.
class ARBatchScanOverlay: UIView {

  private(set) var scannedOrders: [(id: Int, variety: String, qty: Int)] = []
  var onBulkPrepare: (([Int]) -> Void)?
  var onDone: (() -> Void)?

  private let accent = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)
  private let bg = UIColor(red: 0.08, green: 0.07, blue: 0.06, alpha: 0.90)

  private lazy var tableView: UITableView = {
    let tv = UITableView()
    tv.backgroundColor = .clear
    tv.separatorColor = UIColor.white.withAlphaComponent(0.1)
    tv.dataSource = self
    tv.register(UITableViewCell.self, forCellReuseIdentifier: "cell")
    return tv
  }()

  private lazy var countLabel: UILabel = {
    let l = UILabel()
    l.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .semibold)
    l.textColor = UIColor.white.withAlphaComponent(0.7)
    return l
  }()

  private lazy var prepareBtn: UIButton = {
    let b = UIButton(type: .system)
    b.setTitle("PREPARE ALL →", for: .normal)
    b.titleLabel?.font = UIFont.monospacedSystemFont(ofSize: 14, weight: .bold)
    b.setTitleColor(.white, for: .normal)
    b.backgroundColor = accent
    b.layer.cornerRadius = 14
    b.addTarget(self, action: #selector(prepareTapped), for: .touchUpInside)
    return b
  }()

  private lazy var doneBtn: UIButton = {
    let b = UIButton(type: .system)
    b.setTitle("Done", for: .normal)
    b.titleLabel?.font = UIFont.monospacedSystemFont(ofSize: 14, weight: .medium)
    b.setTitleColor(UIColor.white.withAlphaComponent(0.6), for: .normal)
    b.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)
    return b
  }()

  init() {
    super.init(frame: .zero)
    backgroundColor = bg
    layer.cornerRadius = 20
    layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
    buildLayout()
  }

  required init?(coder: NSCoder) { fatalError() }

  private func buildLayout() {
    let header = UIView()
    header.translatesAutoresizingMaskIntoConstraints = false
    addSubview(header)

    let titleLabel = UILabel()
    titleLabel.text = "BATCH SCAN"
    titleLabel.font = UIFont.monospacedSystemFont(ofSize: 12, weight: .bold)
    titleLabel.textColor = accent
    titleLabel.translatesAutoresizingMaskIntoConstraints = false
    header.addSubview(titleLabel)

    countLabel.translatesAutoresizingMaskIntoConstraints = false
    header.addSubview(countLabel)
    updateCount()

    tableView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(tableView)

    prepareBtn.translatesAutoresizingMaskIntoConstraints = false
    addSubview(prepareBtn)

    doneBtn.translatesAutoresizingMaskIntoConstraints = false
    addSubview(doneBtn)

    NSLayoutConstraint.activate([
      header.topAnchor.constraint(equalTo: topAnchor, constant: 16),
      header.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
      header.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
      header.heightAnchor.constraint(equalToConstant: 28),

      titleLabel.leadingAnchor.constraint(equalTo: header.leadingAnchor),
      titleLabel.centerYAnchor.constraint(equalTo: header.centerYAnchor),

      countLabel.trailingAnchor.constraint(equalTo: header.trailingAnchor),
      countLabel.centerYAnchor.constraint(equalTo: header.centerYAnchor),

      tableView.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 8),
      tableView.leadingAnchor.constraint(equalTo: leadingAnchor),
      tableView.trailingAnchor.constraint(equalTo: trailingAnchor),
      tableView.bottomAnchor.constraint(equalTo: prepareBtn.topAnchor, constant: -12),

      prepareBtn.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
      prepareBtn.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
      prepareBtn.heightAnchor.constraint(equalToConstant: 50),
      prepareBtn.bottomAnchor.constraint(equalTo: doneBtn.topAnchor, constant: -8),

      doneBtn.centerXAnchor.constraint(equalTo: centerXAnchor),
      doneBtn.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -12),
      doneBtn.heightAnchor.constraint(equalToConstant: 36),
    ])
  }

  func addOrder(id: Int, variety: String, qty: Int) {
    guard !scannedOrders.contains(where: { $0.id == id }) else { return }
    scannedOrders.append((id: id, variety: variety, qty: qty))
    tableView.reloadData()
    updateCount()
    let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
    impactFeedback.impactOccurred()
  }

  private func updateCount() {
    countLabel.text = "\(scannedOrders.count) order\(scannedOrders.count == 1 ? "" : "s")"
  }

  @objc private func prepareTapped() {
    let ids = scannedOrders.map { $0.id }
    guard !ids.isEmpty else { return }
    prepareBtn.isEnabled = false
    prepareBtn.setTitle("Preparing…", for: .normal)
    onBulkPrepare?(ids)
  }

  @objc private func doneTapped() {
    onDone?()
  }

  func markDone() {
    prepareBtn.setTitle("DONE ✓", for: .normal)
    prepareBtn.backgroundColor = UIColor(red: 0.18, green: 0.72, blue: 0.36, alpha: 1)
  }
}

extension ARBatchScanOverlay: UITableViewDataSource {
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return scannedOrders.count
  }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "cell", for: indexPath)
    cell.backgroundColor = .clear
    let order = scannedOrders[indexPath.row]
    var content = cell.defaultContentConfiguration()
    content.text = order.variety
    content.textProperties.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .medium)
    content.textProperties.color = .white
    content.secondaryText = "×\(order.qty)  ·  #\(order.id)"
    content.secondaryTextProperties.font = UIFont.monospacedSystemFont(ofSize: 10, weight: .regular)
    content.secondaryTextProperties.color = UIColor.white.withAlphaComponent(0.5)
    cell.contentConfiguration = content
    return cell
  }
}
