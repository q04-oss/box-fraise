import UIKit

/// Staff AR overlay — shown on top of the ARSCNView when a staff user scans an NFC tag.
/// Displays order summary and action buttons. Calls `onAction` with "prepare"|"ready"|"flag".
class ARStaffOverlay: UIView {

  private let onAction: (String) -> Void

  init(staffData: NSDictionary, onAction: @escaping (String) -> Void) {
    self.onAction = onAction
    super.init(frame: .zero)
    buildUI(staffData: staffData)
  }

  required init?(coder: NSCoder) { fatalError() }

  private func buildUI(staffData: NSDictionary) {
    backgroundColor = UIColor.black.withAlphaComponent(0.72)
    layer.cornerRadius = 20
    layer.masksToBounds = true

    let varietyName = (staffData["variety_name"] as? String) ?? "Order"
    let status = (staffData["status"] as? String) ?? ""
    let quantityVal = (staffData["quantity"] as? NSNumber)?.intValue ?? 0
    let email = (staffData["customer_email"] as? String) ?? ""
    let slotTime = (staffData["slot_time"] as? String) ?? ""

    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = 10
    stack.layoutMargins = UIEdgeInsets(top: 16, left: 20, bottom: 16, right: 20)
    stack.isLayoutMarginsRelativeArrangement = true
    stack.translatesAutoresizingMaskIntoConstraints = false
    addSubview(stack)
    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: topAnchor),
      stack.leadingAnchor.constraint(equalTo: leadingAnchor),
      stack.trailingAnchor.constraint(equalTo: trailingAnchor),
      stack.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    // Order info row
    let infoLabel = makeLabel(text: "\(varietyName.uppercased())  ·  QTY \(quantityVal)", size: 15, weight: .semibold, color: .white)
    stack.addArrangedSubview(infoLabel)

    // Status pill inline
    let statusPillColor: UIColor
    switch status {
    case "paid": statusPillColor = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)
    case "preparing": statusPillColor = UIColor(red: 0.22, green: 0.75, blue: 0.35, alpha: 1)
    case "ready": statusPillColor = UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1)
    default: statusPillColor = UIColor.gray
    }
    let statusPill = makePill(text: status.uppercased(), color: statusPillColor, textColor: .white)
    stack.addArrangedSubview(statusPill)

    // Customer email (truncated) + slot time
    let truncatedEmail = email.count > 30 ? String(email.prefix(28)) + "…" : email
    let emailLabel = makeLabel(text: truncatedEmail, size: 12, weight: .regular,
                               color: UIColor.white.withAlphaComponent(0.7))
    stack.addArrangedSubview(emailLabel)

    if !slotTime.isEmpty {
      let slotLabel = makeLabel(text: "SLOT  \(slotTime)", size: 12, weight: .regular,
                                color: UIColor.white.withAlphaComponent(0.7))
      stack.addArrangedSubview(slotLabel)
    }

    // Divider
    let divider = UIView()
    divider.backgroundColor = UIColor.white.withAlphaComponent(0.2)
    divider.heightAnchor.constraint(equalToConstant: 0.5).isActive = true
    stack.addArrangedSubview(divider)

    // Action buttons row
    let btnRow = UIStackView()
    btnRow.axis = .horizontal
    btnRow.spacing = 10
    btnRow.distribution = .fillEqually

    if status == "paid" {
      let prepareBtn = makeActionButton(title: "PREPARE", color: UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1))
      prepareBtn.addTarget(self, action: #selector(tappedPrepare), for: .touchUpInside)
      btnRow.addArrangedSubview(prepareBtn)
    }

    if status == "preparing" {
      let readyBtn = makeActionButton(title: "MARK READY", color: UIColor(red: 0.063, green: 0.725, blue: 0.506, alpha: 1))
      readyBtn.addTarget(self, action: #selector(tappedReady), for: .touchUpInside)
      btnRow.addArrangedSubview(readyBtn)
    }

    let flagBtn = makeActionButton(title: "FLAG", color: UIColor(red: 0.85, green: 0.25, blue: 0.25, alpha: 1))
    flagBtn.addTarget(self, action: #selector(tappedFlag), for: .touchUpInside)
    btnRow.addArrangedSubview(flagBtn)

    stack.addArrangedSubview(btnRow)
  }

  // MARK: - Button actions

  @objc private func tappedPrepare() { onAction("prepare") }
  @objc private func tappedReady() { onAction("ready") }
  @objc private func tappedFlag() { onAction("flag") }

  // MARK: - Helpers

  private func makeLabel(text: String, size: CGFloat, weight: UIFont.Weight, color: UIColor) -> UILabel {
    let label = UILabel()
    label.text = text
    label.font = UIFont.monospacedSystemFont(ofSize: size, weight: weight)
    label.textColor = color
    label.numberOfLines = 1
    return label
  }

  private func makePill(text: String, color: UIColor, textColor: UIColor) -> UIView {
    let pill = UIView()
    pill.backgroundColor = color
    pill.layer.cornerRadius = 10
    let label = UILabel()
    label.text = text
    label.font = UIFont.monospacedSystemFont(ofSize: 11, weight: .medium)
    label.textColor = textColor
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    pill.addSubview(label)
    pill.heightAnchor.constraint(equalToConstant: 28).isActive = true
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: pill.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: pill.centerYAnchor),
      label.leadingAnchor.constraint(greaterThanOrEqualTo: pill.leadingAnchor, constant: 10),
      label.trailingAnchor.constraint(lessThanOrEqualTo: pill.trailingAnchor, constant: -10),
    ])
    return pill
  }

  private func makeActionButton(title: String, color: UIColor) -> UIButton {
    let btn = UIButton(type: .system)
    btn.setTitle(title, for: .normal)
    btn.titleLabel?.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .medium)
    btn.setTitleColor(.white, for: .normal)
    btn.backgroundColor = color
    btn.layer.cornerRadius = 12
    btn.heightAnchor.constraint(equalToConstant: 44).isActive = true
    return btn
  }
}
